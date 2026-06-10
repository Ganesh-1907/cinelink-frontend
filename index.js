import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// ADD THIS ↓
import messaging from '@react-native-firebase/messaging';
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background notification:', remoteMessage);
});
// ADD THIS ↑

AppRegistry.registerComponent(appName, () => App);