const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendPushOnNewMessage = onDocumentCreated(
  {
    document: 'conversations/{conversationId}/messages/{messageId}',
    region: 'us-central1'
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const message = snapshot.data();
    if (!message || !message.recipient || !message.sender) return;

    const usersRef = admin.firestore().collection('users');
    const recipientQuery = await usersRef.where('userID', '==', message.recipient).limit(1).get();
    if (recipientQuery.empty) {
      logger.info('Recipient not found', { recipient: message.recipient });
      return;
    }

    const recipientData = recipientQuery.docs[0].data();
    const pushTokens = Array.isArray(recipientData.pushTokens) ? recipientData.pushTokens.filter(Boolean) : [];
    if (!pushTokens.length) {
      logger.info('Recipient has no push tokens', { recipient: message.recipient });
      return;
    }

    const senderQuery = await usersRef.where('userID', '==', message.sender).limit(1).get();
    const senderName = senderQuery.empty ? 'Nova mensagem' : (senderQuery.docs[0].data().username || 'Nova mensagem');

    let body = 'Voce recebeu uma nova mensagem';
    if (message.type === 'text' && message.text) {
      body = 'Toque para abrir a conversa';
    } else if (message.type === 'image') {
      body = `${senderName} enviou uma imagem`;
    } else if (message.type === 'file') {
      body = `${senderName} enviou ${message.fileName || 'um arquivo'}`;
    }

    const payload = {
      tokens: pushTokens,
      notification: {
        title: senderName,
        body
      },
      data: {
        conversationId: event.params.conversationId,
        senderId: message.sender,
        recipientId: message.recipient,
        url: '/'
      },
      webpush: {
        notification: {
          title: senderName,
          body,
          requireInteraction: false
        },
        fcmOptions: {
          link: '/'
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    const invalidTokens = [];

    response.responses.forEach((result, index) => {
      if (!result.success) {
        const code = result.error?.code || '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(pushTokens[index]);
        }
      }
    });

    if (invalidTokens.length) {
      await recipientQuery.docs[0].ref.update({
        pushTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
      });
    }
  }
);
