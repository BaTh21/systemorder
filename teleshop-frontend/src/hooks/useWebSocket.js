import {
  useEffect,
  useState
} from "react";

import wsService from "../services/websocket";
import { useAuth } from "../contexts/AuthContext";


export default function useWebSocket(){

  const { user } = useAuth();

  const [isConnected,setIsConnected]
    = useState(false);


  const [notifications,setNotifications]
    = useState([]);



  useEffect(()=>{


    if(!user){

      return;

    }



    wsService.connect();



    const connected = ()=>{

      setIsConnected(true);

    };


    const disconnected = ()=>{

      setIsConnected(false);

    };


    const notification = (data)=>{

      setNotifications(
        prev=>[
          data,
          ...prev
        ].slice(0,50)
      );

    };



    wsService.on(
      "connected",
      connected
    );


    wsService.on(
      "disconnected",
      disconnected
    );


    wsService.on(
      "notification",
      notification
    );



    return ()=>{

      wsService.off(
        "connected",
        connected
      );


      wsService.off(
        "disconnected",
        disconnected
      );


      wsService.off(
        "notification",
        notification
      );

    };


  },[user]);



  return {
    isConnected,
    notifications,
    sendMessage:
      wsService.send.bind(wsService)
  };

}