import argparse
import asyncio
import secrets
from getpass import getpass

from sqlalchemy import select

from backend.auth.service import hash_password
from backend.database import SessionLocal
from backend.models import Role, User


async def _get_or_create_role(session, role_name: str) -> Role:
    result = await session.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if role is None:
        role = Role(name=role_name, description=f"{role_name} role")
        session.add(role)
        await session.commit()
        await session.refresh(role)
    return role


async def _ensure_unique_user(session, username: str, email: str) -> None:
    result = await session.execute(
        select(User).where((User.username == username) | (User.email == email))
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        raise SystemExit("A user with that username or email already exists.")


async def create_admin(username: str, email: str, password: str | None, role_name: str) -> dict[str, str]:
    async with SessionLocal() as session:
        await _ensure_unique_user(session, username, email)
        role = await _get_or_create_role(session, role_name)

        generated_password = False
        if not password:
            password = secrets.token_urlsafe(16)
            generated_password = True

        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role_id=role.id,
            mfa_secret=None,
            is_active=True,
        )
        session.add(user)
        await session.commit()

    return {
        "username": username,
        "email": email,
        "role": role_name,
        "password": password,
        "password_generated": generated_password,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an administrator account.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", default="Admin")
    parser.add_argument("--password", help="Optional password. Will prompt if omitted.")
    args = parser.parse_args()

    password = args.password
    if password is None:
        password = getpass("Password (leave blank to auto-generate): ")
        if not password:
            password = None

    details = asyncio.run(create_admin(args.username, args.email, password, args.role))
    print("User created:")
    print(f"  Username: {details['username']}")
    print(f"  Email:    {details['email']}")
    print(f"  Role:     {details['role']}")
    if details["password_generated"]:
        print(f"  Password (generated): {details['password']}")
    else:
        print("  Password: (provided)")


if __name__ == "__main__":
    main()
