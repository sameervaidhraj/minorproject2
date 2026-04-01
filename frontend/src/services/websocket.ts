type Listener = (payload: unknown) => void;

export const createChannel = (path: string) => {
  const base = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";
  const url = `${base}${path}`;
  const socket = new WebSocket(url);
  const listeners = new Set<Listener>();

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((listener) => listener(data));
    } catch (error) {
      console.error("Invalid websocket payload", error);
    }
  };

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      socket.close();
    }
  };
};
