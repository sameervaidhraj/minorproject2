import base64
import hashlib
import json
from typing import Iterable, Sequence

from Crypto.Cipher import AES
from Crypto.Protocol.SecretSharing import Shamir
from Crypto.Random import get_random_bytes

BLOCK_SIZE = 16


def _derive_key(secret: str) -> bytes:
    return hashlib.sha256(secret.encode()).digest()


def encrypt_secret(plaintext: str, secret: str) -> str:
    key = _derive_key(secret)
    nonce = get_random_bytes(12)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode())
    payload = nonce + tag + ciphertext
    return base64.b64encode(payload).decode()


def decrypt_secret(payload: str, secret: str) -> str:
    raw = base64.b64decode(payload)
    nonce, tag, ciphertext = raw[:12], raw[12:28], raw[28:]
    key = _derive_key(secret)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    return plaintext.decode()


def split_master_key(master_key: str, shares: int, threshold: int) -> list[tuple[int, str]]:
    key_bytes = _derive_key(master_key)[:16]
    pieces = Shamir.split(threshold, shares, key_bytes)
    encoded: list[tuple[int, str]] = []
    for idx, value in pieces:
        encoded.append((idx, base64.b64encode(value).decode()))
    return encoded


def combine_master_key(shares: Sequence[tuple[int, str]]) -> str:
    decoded = [(idx, base64.b64decode(value)) for idx, value in shares]
    key_bytes = Shamir.combine(decoded)
    return hashlib.sha256(key_bytes).hexdigest()


def next_chain_hash(prev_hash: str, payload: dict | str) -> str:
    if isinstance(payload, str):
        serialized = payload
    else:
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    data = f"{prev_hash}:{serialized}".encode()
    return hashlib.sha256(data).hexdigest()
