export const createChannel = (path) => {
    const base = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";
    const url = `${base}${path}`;
    const socket = new WebSocket(url);
    const listeners = new Set();
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            listeners.forEach((listener) => listener(data));
        }
        catch (error) {
            console.error("Invalid websocket payload", error);
        }
    };
    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        close() {
            socket.close();
        }
    };
};
