class WebSocketService {

  constructor() {
    this.ws = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.heartbeat = null;
  }


  connect() {

    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      return;
    }


    const token =
      localStorage.getItem("access_token");


    if (!token) {
      console.warn("No token");
      return;
    }


    const cleanToken =
      token.replace(/^Bearer\s+/i, "");


    const protocol =
      window.location.protocol === "https:"
        ? "wss:"
        : "ws:";

    const wsUrl =
      `${protocol}//localhost:8000/api/ws/global?token=${encodeURIComponent(cleanToken)}`;

    console.log("WebSocket URL:", wsUrl);

    this.ws = new WebSocket(wsUrl);


    this.ws.onopen = () => {

      console.log(
        "WebSocket connected"
      );

      this.emit(
        "connected"
      );


      this.startHeartbeat();

    };



    this.ws.onmessage = (event) => {

      const data =
        JSON.parse(event.data);


      if (
        data.type === "system_notification"
      ) {
        this.emit(
          "notification",
          data
        );
      }


      this.emit(
        "message",
        data
      );

    };



    this.ws.onclose = () => {

      console.log(
        "WebSocket closed"
      );


      this.stopHeartbeat();


      this.emit(
        "disconnected"
      );

    };



    this.ws.onerror = (err) => {

      console.error(
        "WebSocket error",
        err
      );

    };

  }



  send(data) {

    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      this.ws.send(
        JSON.stringify(data)
      );
    }

  }



  startHeartbeat() {

    this.stopHeartbeat();


    this.heartbeat =
      setInterval(() => {

        this.send({
          type: "ping"
        });

      }, 30000);

  }



  stopHeartbeat() {

    if (this.heartbeat) {

      clearInterval(
        this.heartbeat
      );

      this.heartbeat = null;

    }

  }



  on(event, callback) {

    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);

  }



  emit(event, data) {

    if (this.listeners[event]) {

      this.listeners[event]
        .forEach(cb => cb(data));

    }

  }

}


export default new WebSocketService();