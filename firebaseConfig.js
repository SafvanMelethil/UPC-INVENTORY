// Firebase configuration for UPC Inventory (Safvan)
const firebaseConfig = {
  apiKey: "AIzaSyDhT7mL3cH48yiRCekNL3xft0PLA08MCF4",
  authDomain: "upc-inventory-81649.firebaseapp.com",
  projectId: "upc-inventory-81649",
  storageBucket: "upc-inventory-81649.appspot.com",
  messagingSenderId: "367137086574",
  appId: "1:367137086574:web:3a60fd29268bf99c81da7f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();
