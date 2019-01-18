const { ActivityTypes } = require('botbuilder');
const { DialogSet } = require('botbuilder-dialogs');
const { AuthenticationDialog, AUTHENTICATION_DIALOG, HELP_TEXT, CONNECTION_NAME } = require('./dialogs/authentication');
const DIALOG_STATE_PROPERTY = 'dialogState';
const VALID_COMMANDS = ['logout', 'help'];

class AuthenticationBot {
    constructor(conversationState) {
        if (!conversationState) throw new Error('Missing parameter.  conversationState is required');

        this.dialogState = conversationState.createProperty(DIALOG_STATE_PROPERTY);

        this.dialogs = new DialogSet(this.dialogState);
        this.dialogs.add(new AuthenticationDialog(AUTHENTICATION_DIALOG));

        this.conversationState = conversationState;
    }

    async onTurn(turnContext) {
        if (turnContext.activity.type === ActivityTypes.Message) {
            const dialogContext = await this.dialogs.createContext(turnContext);
            const text = turnContext.activity.text;

            await dialogContext.continueDialog();

            if (VALID_COMMANDS.includes(text)) {
                if (text === 'help') {
                    await turnContext.sendActivity(HELP_TEXT);
                }
                if (text === 'logout') {
                    let botAdapter = turnContext.adapter;
                    await botAdapter.signOutUser(turnContext, CONNECTION_NAME);
                    await turnContext.sendActivity('You have been signed out.');
                    await turnContext.sendActivity(HELP_TEXT);
                }
            } else {
                if (!turnContext.responded) {
                    await dialogContext.beginDialog(AUTHENTICATION_DIALOG);
                }
            };
        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            const members = turnContext.activity.membersAdded;

            for (let index = 0; index < members.length; index++) {
                const member = members[index];
                if (member.id !== turnContext.activity.recipient.id) {
                    const welcomeMessage = `Welcome to AuthenticationBot ${member.name}. ` + HELP_TEXT;
                    await turnContext.sendActivity(welcomeMessage);
                }
            };
        } else if (turnContext.activity.type === ActivityTypes.Invoke || turnContext.activity.type === ActivityTypes.Event) {
            const dialogContext = await this.dialogs.createContext(turnContext);
            await dialogContext.continueDialog();
            if (!turnContext.responded) {
                await dialogContext.beginDialog(AUTHENTICATION_DIALOG);
            }
        } else {
            await turnContext.sendActivity(`[${turnContext.activity.type} event detected.]`);
        }

        await this.conversationState.saveChanges(turnContext);
    }
}

module.exports.AuthenticationBot = AuthenticationBot;
