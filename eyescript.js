const firebaseConfig = {
  apiKey: "AIzaSyC3u1v8c37Yssin8-ZebWUBhS8wottPe18",
  authDomain: "vyowir.firebaseapp.com",
  projectId: "vyowir",
  storageBucket: "vyowir.firebasestorage.app",
  messagingSenderId: "66394206468",
  appId: "1:66394206468:web:22c4bebf0c6d5da3ef2051",
  measurementId: "G-CB5L1MXNQR"
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
