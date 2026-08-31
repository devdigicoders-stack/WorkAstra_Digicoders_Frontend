// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
    apiKey: "AIzaSyCGlmY-ior7xqv_-4PiQcs1CoePb7IDM90",
    authDomain: "collegepanel-1027b.firebaseapp.com",
    projectId: "collegepanel-1027b",
    storageBucket: "collegepanel-1027b.firebasestorage.app",
    messagingSenderId: "335340683871",
    appId: "1:335340683871:web:2755bd2b336f7c355bd1ea"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Firebase automatically displays a notification if payload.notification is present.
  // To avoid duplicate notifications, we skip manual creation in that case.
  if (payload.notification) {
      return;
  }

  const notificationTitle = payload.data?.title || 'New Notification';
  const notificationOptions = {
    body: payload.data?.body || '',
    icon: '/logo1.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
