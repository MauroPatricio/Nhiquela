import {useState, useEffect, useRef} from 'react'

import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'

import Constants from 'expo-constants'

import { Platform } from 'react-native'

export interface PushNotificationState{
    notification?: Notifications.Notification;
    expoPushToken?: Notifications.ExpoPushToken;
}


export const usePushNotifications = (): PushNotificationState =>{
    Notifications.setNotificationHandler({
        handleNotification: async ()=> ({
            shouldPlaySound: true,
            shouldShowAlert: true,
            shouldSetBadge: true
        })
    })

    const [expoPushToken, setExpoPushToken ] = useState<Notifications.ExpoPushToken | undefined>();
    const [notification, setNotification ] = useState<Notifications.Notification | undefined>();

    const notificationListener = useRef<Notifications.Subscription>();
    const responsListener = useRef<Notifications.Subscription>();

    async function registerForPushNotificationsAsync() {
        let token;

        if(Device.isDevice){
            const {status: existingStatus} = await Notifications.getPermissionsAsync();

            let finalStatus = existingStatus;

            if (existingStatus !== "granted"){
                const {status} = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== "granted"){
                alert("Failed to get push token")
            }
            token = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId
            })
            if(Platform.OS === 'android'){
                Notifications.setNotificationChannelAsync("default",
                  {  name: 'Default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                lightColor: '7F00FF'}
                )
            }
            return token;
        }else{
            console.log("Erro use um telefone")
        }
        
    }

    useEffect(()=>{

        registerForPushNotificationsAsync().then((token) =>{
            setExpoPushToken(token)
        });

     
        notificationListener.current = Notifications.addNotificationReceivedListener((notification)=>{
            setNotification(notification)
        })

        responsListener.current = Notifications.addNotificationResponseReceivedListener((response)=> {
        })
        return () => {
            Notifications.removeNotificationSubscription(
                notificationListener.current!
            );

            Notifications.removeNotificationSubscription(
                responsListener.current!
            )
        }
    },[])

    return{
       expoPushToken,
        notification
    }
}