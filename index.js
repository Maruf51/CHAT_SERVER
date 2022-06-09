const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
require('dotenv').config();
const ObjectId = require('mongodb').ObjectID



const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
// for socket
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
      origin: "*"
    }
  });


app.get('/', (req, res) => {
    res.send('everything is ok')
})
////////////////////////////////////////////////////////////////////////////////////////////

io.on("connection", (socket) => {
    // console.log(socket.id); // x8WIv7-mJelg7on_ALbx
  });

  let users = []

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === socketId) &&
    users.push({userId, socketId})
}

const removeUser = (socketId) => {
  users = users.filter(user => user.socketId !== socketId)
}

const getUser = (userID) => {
  return users.find((user) => user.userId === userID);
};

io.on('connection', (socket) => {
  // when connect
//   console.log('a user connected')
  // adding user to socket server
  socket.on('addUser', (userId) => {
    addUser(userId, socket.id)
    io.emit('getSocketUsers', users)
  })

//   send and get message
  socket.on("sendMessage", ({ messageId, sendId, receiverId, message }) => {
    const user = getUser(receiverId);
    if (user) {
      io.to(user.socketId).emit("getMessage", {
        sendId,
        messageId,
        message,
      });
    }
  });

  // Start New Conversation
//   socket.on("newConversation", (userID) => {
//     const user = getUser(userID.userID)
//     console.log(userID);
//     console.log(users)
//     console.log(user)
//     if (user) {
//       io.to(user.socketId).emit("startConversation", {
//         userID,
//         startConversation: true
//       })
//     }
//   })

  // when disconnect
  socket.on('disconnect', () => {
    // console.log('a user disconnected')
    removeUser(socket.id)
    io.emit('getSocketUsers', users)
  })
})

/////////////////////////////////////////////////////////////////////////////////

var ImageKit = require("imagekit");
const imagekit = new ImageKit({
    publicKey : "public_oMtSciIGjj/z2sxDOGfO2y4i6zw=",    
    privateKey : "private_ISvM6qaaDBDRWI/ghLkbGWuC22Q=",
    urlEndpoint : "https://ik.imagekit.io/znex04bydzr"
});
app.get('/auth', function (req, res) {
    var result = imagekit.getAuthenticationParameters();
    res.send(result);
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://maruf_chat:Noor62427@cluster0.x3bkf.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

client.connect(err => {
    // console.log(err)
    const usersCollection = client.db("chat").collection("users");
    const messagesCollection = client.db("chat").collection("messages");

    app.post('/register-user', (req, res) => {
        const data = req.body
        usersCollection.find({})
        .toArray((err, documents) => {
            const alreadyRegistered = documents.find(user => user.email === data.email)
            if(alreadyRegistered !== undefined) {
                res.send({error: 'This email is already used in another account!'})
            }
            else {
                usersCollection.insertOne(data)
                .then(result => {
                    const data = result.ops[0]
                    delete data.password
                    res.send(data)
                })
                .catch(err => res.send(err))
            }
        })
    })

    app.post('/login-user', (req, res) => {
        const data = req.body
        usersCollection.find({})
        .toArray((err, documents) => {
            const loginUser = documents.find(user => user.email === data.email)
            if(loginUser !== undefined) {
                if(loginUser.password === data.password) {
                    const newData = loginUser
                    delete newData.password
                    res.send(newData)
                }
                else {
                    res.send({error: 'The provided password is incorrect.'})
                }
            }
            else {
                res.send({error: 'This email is not registered!'})
            }
        })
    })

    // getting all the conversations of a user
    app.post('/get-conversations', (req, res) => {
        const email= req.body;
        usersCollection.find({})
        .toArray((err, docs) => {
            // getting a user data
            const userFound = docs.find(user => user.email === email.email)
            // checking if there is already conversations exists or not
            if(userFound.messages) {
                messagesCollection.find({})
                .toArray((err, docs) => {
                    const allConversations = docs;
                    const selectedConversations = []

                    for(let i = 0; i < userFound.messages.length; i++) {
                        const conversationID = userFound.messages[i]
                        const selectedConversation = allConversations.find(conversation => conversation._id.toString() === conversationID.toString())
                        selectedConversations.push(selectedConversation)
                      }
                    
                    res.send(selectedConversations)
                })
            }
            else {
                console.log('There is no conversations on this email.')
            }
        })
    })

    // for sending any messages
    app.post('/send-message', (req, res) => {
        const data = req.body.newMessageData;
        const messageID = req.body.messageID;
        data.timestamps = new Date().getTime();
        
        // getting all messages
        messagesCollection.find({_id: ObjectId(messageID)})
        .toArray((err, docs) => {
            const newMessages = docs[0].message
            newMessages.push(data)
            // inserting a new message into an existing conversation
            messagesCollection.updateOne(
                { _id: ObjectId(messageID) },
                {
                $set: {message: newMessages},
                }
            )
            .then(result =>  res.send(result))
            .catch(err => console.log(err))
        })
    })

    // for deleting any messages
    app.post('/delete-message', (req, res) => {
        const UID = req.body.UID;
        const messageID = req.body.messageID;
        
        messagesCollection.find({_id: ObjectId(messageID)})
        .toArray((err, docs) => {
            const selectedMessageIndex = docs[0].message.findIndex(obj => obj.UID.toString() === UID.toString())
            const newMessages = docs[0].message
            newMessages[selectedMessageIndex].deleted = true;
            // changing the messages
            messagesCollection.updateOne(
                { _id: ObjectId(messageID) },
                {
                $set: {message: newMessages},
                }
            )
            .then(result =>  res.send(result))
            .catch(err => console.log(err))
        })
    })

    // adding first message of any new conversations  
    app.post('/new-message', (req, res) => {
        const data = req.body.data;
        const fromImage = req.body.image;
        const fromName = req.body.name;
        const fromEmail = req.body.email;
        data.timestamps = new Date().getTime();
        // for checking there is any user
        usersCollection.find({})
        .toArray((err, documents) => {
            // checking to user found
            const isUser = documents.find(user => user.email === data.to)
            // if user found
            if(isUser) {
                data.toID = String(isUser._id)
                const newData = [{...data}]
                const newData2 = {message: newData, fromImage, toImage: isUser.image, fromName, toName: isUser.name, fromEmail, toEmail: isUser.email, fromID:newData[0].fromID, toID:newData[0].toID}
                // inserting data to messages collection
                messagesCollection.insertOne(newData2)
                .then(addedMessage => {
                    const insertedData = addedMessage.ops[0]
                    // res.send(insertedData)
                    // updating message data to FromUsers database
                    const fromUser = documents.find(user => user.email === newData2.message[0].from)
                    if(fromUser.messages) {
                        const newFromMessageArray = fromUser.messages
                        newFromMessageArray.push(String(addedMessage.ops[0]._id))

                        usersCollection.updateOne(
                            { _id: ObjectId(newData2.message[0].fromID) },
                            {
                            $set: {messages: newFromMessageArray},
                            }
                        )
                        .then(result =>  {
                            if(isUser.messages) {
                                const newToMessageArray = isUser.messages
                                newToMessageArray.push(String(addedMessage.ops[0]._id))

                                usersCollection.updateOne(
                                    { _id: ObjectId(newData2.message[0].toID) },
                                    {
                                    $set: {messages: newToMessageArray},
                                    }
                                )
                                .then(result =>  res.send(isUser._id))
                                .catch(err => console.log(err))
                            }
                            else {
                                usersCollection.updateOne(
                                    { _id: ObjectId(newData2.message[0].toID) },
                                    {
                                    $set: {messages: [String(addedMessage.ops[0]._id)]},
                                    }
                                )
                                .then(result =>  res.send(isUser._id))
                                .catch(err => console.log(err))
                            }
                        })
                        .catch(err => console.log(err))
                    }
                    else {
                        usersCollection.updateOne(
                            { _id: ObjectId(newData2.message[0].fromID) },
                            {
                            $set: {messages: [String(addedMessage.ops[0]._id)]},
                            }
                        )
                        .then(result =>  {
                            if(isUser.messages) {
                                const newToMessageArray = isUser.messages
                                newToMessageArray.push(String(addedMessage.ops[0]._id))
                                
                                usersCollection.updateOne(
                                    { _id: ObjectId(newData2.message[0].toID) },
                                    {
                                    $set: {messages: newToMessageArray},
                                    }
                                )
                                .then(result =>  res.send(isUser._id))
                                .catch(err => console.log(err))
                            }
                            else {
                                usersCollection.updateOne(
                                    { _id: ObjectId(newData2.message[0].toID) },
                                    {
                                    $set: {messages: [String(addedMessage.ops[0]._id)]},
                                    }
                                )
                                .then(result =>  res.send(isUser._id))
                                .catch(err => console.log(err))
                            }
                        })
                        .catch(err => console.log(err))
                    }
                })
                .catch(err => console.log(err))
            }
            // if user can not found
            else {
                res.send({error: 'There is no user registered with this email.'})
            }
        })
    })
});

server.listen(process.env.PORT || 5000)
// server.listen(5000)