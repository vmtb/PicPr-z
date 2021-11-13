import * as functions from "firebase-functions";

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
import * as admin from "firebase-admin";
import * as firebaseHelper from "firebase-functions-helper";
import * as express from "express";
import * as bodyParser from "body-parser";
admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
const app = express();
const main = express();

const usersCollection = "users";
const contactsCollection = "contacts";
const ppRequestsCollection = "pp-requests";
const imagesCollection = "images";

//Add user
app.post("/users", async (req, res) => {
  try {
    const user = {
      age: req.body["age"],
      displayName: req.body["displayName"],
      email: req.body["email"],
      phoneNumber: req.body["phoneNumber"],
      online: req.body["online"],
      photoURL: req.body["photoURL"],
      uid: req.body["uid"],
    };
    await firebaseHelper.firestoreHelper.createDocumentWithID(
      db,
      usersCollection,
      user.uid,
      user
    );
    res.status(201).send(`Utilisateur ajouté avec succès: ${user.uid}`);
  } catch (error) {
    res
      .status(400)
      .send(
        `Contact should only contains firstName, phone,onlineStatus, lastName and email!!!`
      );
  }
});

// View all users
app.get("/users", (req, res) => {
  firebaseHelper.firestoreHelper
    .backup(usersCollection)
    .then((data) => res.status(200).send(data))
    .catch((error) => res.status(400).send(`Cannot get pppp: ${error}`));
});

//Ajouter un contact
app.post("/contact", async (req, res) => {
  try {
    const contact = {
      senderId: req.body["senderId"],
      receiverId: req.body["receiverId"],
      bloque: false,
      time: new Date().getTime(),
    };
    /*const docCreated=*/ await firebaseHelper.firestoreHelper.createNewDocument(
      db,
      contactsCollection,
      contact
    );
    //await firebaseHelper.firestoreHelper.createDocumentWithID(db, contactsCollection, docCreated.id, contact);
    res.status(201).send(`Contact ajouté avec succès !  ${contact.time}`);
  } catch (error) {
    res.status(400).send(`senderId, receiverId are required`);
  }
});

//Supprimer un contact
app.delete("/contacts/:contactId", async (req, res) => {
  const deletedContact = await firebaseHelper.firestoreHelper.deleteDocument(
    db,
    contactsCollection,
    req.params.contactId
  );
  res.status(204).send(`Contact is deleted: ${deletedContact}`);
});

//Bloquer un contact
app.patch("/contacts/:contactId", async (req, res) => {
  const data = {
    bloque: true,
  };
  const updatedDoc = await firebaseHelper.firestoreHelper.updateDocument(
    db,
    contactsCollection,
    req.params.contactId,
    data
  );
  res.status(204).send(`Update a new contact: ${updatedDoc}`);
});

//Mes contacts
app.get("/contacts/:userId", async (req, res) => {
  firebaseHelper.firestoreHelper
    .queryData(db, contactsCollection, [["senderId", "==", req.params.userId]])
    .then((data) => {
      if (data != "No such document!") res.status(200).send(data);
      else {
        res.status(200).send("[]");
      }
    })
    .catch((error) =>
      res.status(400).send(`Cannot get mes contacts: ${error}`)
    );
});

//Envoyer requête de photo
app.post("/pp-requests", async (req, res) => {
  try {
    const pp_req = {
      imageId: "",
      senderId: req.body["senderId"],
      reveiverId: req.body["reveiverId"],
      between: req.body["reveiverId"] + "#" + req.body["senderId"],
      time: new Date().getTime(),
      state: "pending",
    };
    const ppId = await firebaseHelper.firestoreHelper.createNewDocument(
      db,
      ppRequestsCollection,
      pp_req
    );
    res.status(201).send(`Requête envoyée avec succès: ${ppId}`);
  } catch (error) {
    res.status(400).send(`senderId, receiverId are required!!!`);
  }
});
//Une conversation
app.post("/pp-requests-lists", async (req, res) => {
  const senderId = req.body["senderId"];
  const reveiverId = req.body["reveiverId"];
  firebaseHelper.firestoreHelper
    .queryData(db, ppRequestsCollection, [
      [
        "between",
        "in",
        [senderId + "#" + reveiverId, reveiverId + "#" + senderId],
      ],
    ])
    .then((data) => {
      if (data != "No such document!") res.status(200).send(data);
      else {
        res.status(200).send("[]");
      }
    })
    .catch((error) =>
      res.status(400).send(`Cannot get mes contacts: ${error}`)
    );
});
//Répondre à une requête de photo
app.post("/pp-feedback", async (req, res) => {
  try {
    const pp_reqId = req.body["pp_requestId"];
    const type = req.body["type"];
    var imgReq;
    if (type == "accepted") {
      const image = {
        picUrl: req.body["picUrl"],
        label: req.body["label"],
        type: type,
        time: new Date().getTime(),
      };
      imgReq = await firebaseHelper.firestoreHelper.createNewDocument(
        db,
        imagesCollection,
        image
      );
    }
    const data = {
      state: imgReq == undefined ? "rejected" : "accepted",
      imageId: imgReq == undefined ? "" : imgReq.id,
    };
    const updatedDoc = await firebaseHelper.firestoreHelper.updateDocument(
      db,
      ppRequestsCollection,
      pp_reqId,
      data
    );

    res.status(201).send(`Requête a été répondu avec succès ${updatedDoc.id}`);
  } catch (error) {
    res
      .status(400)
      .send(
        `type, pp_requestId are required!!! type must be accepted or rejected; If type is accepted, picUrl, label are required`
      );
  }
});

//Récupérer la liste des contacts sur Pic
app.post("/mycontacts", (req, res) => {
  var resultAllUser;
  firebaseHelper.firestoreHelper
    .backup(usersCollection)
    .then((data) => {
      resultAllUser = data;

      if (resultAllUser == undefined) {
        res.status(400).send(`Error 400 ${resultAllUser} `);
      } else {
        try {
          var userContacts = req.body.userContacts;
          var contacts = userContacts.split(";");
          resultAllUser = resultAllUser["users"];
          console.log(resultAllUser);
          var resultData = "{";
          for (let index = 0; index < contacts.length; index++) {
            const element = contacts[index];

            let docs = data[usersCollection];
            for (const key in docs) {
              if (docs.hasOwnProperty(key)) {
                console.log("Doc id: ", key);
                console.log("Document data: ", docs[key]);
                const element2 = JSON.stringify(docs[key]);
                if (element2.includes('"phoneNumber":"' + element + '"')) {
                  resultData += element2 + ",";
                }
              }
            }
          }
          resultData += "}";
          res.status(200).send(resultData);
        } catch (error) {
          res.status(400).send(`userContacts is required: ${error}`);
        }
      }
    })
    .catch((error) => res.status(400).send(`Cannot get users: ${error}`));
});

app.get("*/hello-world", (req, res) => {
  return res.status(200).send("Hello World!");
});

app.get("*/hello-world", (req, res) => {
  return res.status(200).send("Hello World!");
});

const path = require("path");
app.get("/docs", function (req, res) {
  res.sendFile(path.join(__dirname + "/doc.html"));
});

// const swaggerUi = require("swagger-ui-express");
// //const swaggerDocument = require("./swagger.json");

// const swaggerJsdoc = require("swagger-jsdoc");

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerJsdoc));
type PhoneNumber = {
  number: string;
  user: admin.auth.UserRecord | null;
};

type Contact = {
  id: string;
  phoneNumbers: PhoneNumber[];
};

type IFindFriends = {
  contacts: Contact[];
};

async function findFriendByNumber({ number, user }: PhoneNumber) {
  console.log(`Checking for ${number}...`);
  try {
    const userRecord = await admin.auth().getUserByPhoneNumber(number);
    const { displayName, uid } = userRecord;

    return Promise.resolve({
      number,
      user: {
        displayName,
        number,
        uid,
      },
    });
  } catch (error) {
    /*if (error.code !== "auth/user-not-found") */ {
      console.log(error);
    }
    return Promise.resolve({ number, user });
  }
}

async function findFriendByNumbers({ id, phoneNumbers }: Contact) {
  try {
    const numbers = await Promise.all(phoneNumbers.map(findFriendByNumber));

    return {
      id,
      phoneNumbers: numbers,
    };
  } catch ({ message }) {
    console.log(message);
    return null;
  }
}

export const findFriends = functions.https.onCall(
  async ({ contacts }: IFindFriends) => {
    try {
      return Promise.all(contacts.map(findFriendByNumbers));
    } catch ({ message }) {
      console.log(message);
    }
  }
);

main.use("/api/v1", app);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));
export const webApi = functions.https.onRequest(main);
