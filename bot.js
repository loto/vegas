const { ActivityTypes, CardFactory } = require('botbuilder')
const { DialogSet } = require('botbuilder-dialogs')
const { WelcomeCard } = require('./cards/welcome')
const {
  AuthenticationDialog,
  AUTHENTICATION_DIALOG,
  CONNECTION_NAME
} = require('./dialogs/authentication')
const DIALOG_STATE_PROPERTY = 'dialogState'
const VALID_COMMANDS = ['logout', 'help']
const HELP_TEXT =
  " Type anything to get logged in. Type 'logout' to signout." +
  " Type 'help' to view this message again"

class AuthenticationBot {
  constructor (conversationState) {
    if (!conversationState) throw new Error('Missing parameter.  conversationState is required')

    this.dialogState = conversationState.createProperty(DIALOG_STATE_PROPERTY)

    this.dialogs = new DialogSet(this.dialogState)
    this.dialogs.add(new AuthenticationDialog(AUTHENTICATION_DIALOG))

    this.conversationState = conversationState
  }

  async onTurn (turnContext) {
    switch (turnContext.activity.type) {
      case ActivityTypes.Message:
        const dialogContext = await this.dialogs.createContext(turnContext)
        const text = turnContext.activity.text

        if (!dialogContext.activeDialog) {
          if (VALID_COMMANDS.includes(text)) {
            if (text === 'help') {
              await turnContext.sendActivity(HELP_TEXT)
            }
            if (text === 'logout') {
              let botAdapter = turnContext.adapter
              await botAdapter.signOutUser(turnContext, CONNECTION_NAME)
              await turnContext.sendActivity('You have been signed out.')
            }
          } else {
            if (!turnContext.responded) {
              await dialogContext.beginDialog(AUTHENTICATION_DIALOG)
            }
          }
        } else {
          await dialogContext.continueDialog()
        }
        break

      case ActivityTypes.ConversationUpdate:
        const members = turnContext.activity.membersAdded

        for (let index = 0; index < members.length; index++) {
          const member = members[index]
          if (member.id !== turnContext.activity.recipient.id) {
            const welcomeCard = CardFactory.adaptiveCard(WelcomeCard)
            await turnContext.sendActivity({ attachments: [welcomeCard] })
          }
        }
        break

      case ActivityTypes.Invoke:
      case ActivityTypes.Event:
        const dialogContext1 = await this.dialogs.createContext(turnContext)
        await dialogContext1.continueDialog()
        if (!turnContext.responded) {
          await dialogContext1.beginDialog(AUTHENTICATION_DIALOG)
        }
        break

      default:
        await turnContext.sendActivity(`[${turnContext.activity.type} event detected.]`)
        break
    }

    await this.conversationState.saveChanges(turnContext)
  }
}

module.exports.AuthenticationBot = AuthenticationBot
