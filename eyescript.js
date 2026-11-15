const firebaseConfig = {
  apiKey: "AIzaSyCx-NxvglN36G5sxJte1dysIHLEsrw2OtM",
  authDomain: "esse-2c2a1.firebaseapp.com",
  projectId: "esse-2c2a1",
  storageBucket: "esse-2c2a1.firebasestorage.app",
  messagingSenderId: "406058800704",
  appId: "1:406058800704:web:0d78ef7ff2ba64e7e5f1a5",
  measurementId: "G-YFFM5FYYDH"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const counterDoc = db.collection('counters').doc('visitorCount');

async function incrementVisitorCount() {
  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterDoc);
      if (!doc.exists) {
        transaction.set(counterDoc, { count: 1 });
        return 1;
      }
      const newCount = (doc.data().count || 0) + 1;
      transaction.update(counterDoc, { count: newCount });
      return newCount;
    }).then((newCount) => {
      const countElement = document.getElementById('view-count-number');
      if (countElement) {
        countElement.innerText = newCount;
      }
    });
  } catch (e) {
    console.error("Transaction failed: ", e);
    const countElement = document.getElementById('view-count-number');
    if (countElement) {
      countElement.innerText = "Error";
    }
  }
}

incrementVisitorCount();
