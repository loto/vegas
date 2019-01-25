const { ActivityTypes } = require('botbuilder')
const { DialogSet } = require('botbuilder-dialogs')
const { WelcomeCard } = require('./cards/welcome')
const { HelpCard } = require('./cards/help')
const { ErrorCard } = require('./cards/error')
const {
  SignInDialog,
  SIGN_IN_DIALOG,
  CONNECTION_NAME
} = require('./dialogs/authentication')
const DIALOG_STATE_PROPERTY = 'dialogState'
const VALID_COMMANDS = ['logout', 'help']

class AuthenticationBot {
  constructor (conversationState) {
    if (!conversationState) throw new Error('Missing parameter.  conversationState is required')

    this.dialogState = conversationState.createProperty(DIALOG_STATE_PROPERTY)

    this.dialogs = new DialogSet(this.dialogState)
    this.dialogs.add(new SignInDialog(SIGN_IN_DIALOG))

    this.conversationState = conversationState
  }

  async onTurn (turnContext) {
    switch (turnContext.activity.type) {
      case ActivityTypes.Message:
        await this.onActivityMessage(turnContext)
        break

      case ActivityTypes.Invoke:
      case ActivityTypes.Event:
        await this.onActivityEvent(turnContext)
        break

      case ActivityTypes.ConversationUpdate:
        await this.onActivityConversationUpdate(turnContext)
        break

      default:
        await turnContext.sendActivity(`[${turnContext.activity.type} event detected.]`)
        break
    }

    await this.conversationState.saveChanges(turnContext)
  }

  async onActivityMessage (turnContext) {
    const dialogContext = await this.dialogs.createContext(turnContext)
    const text = turnContext.activity.text

    if (!dialogContext.activeDialog) {
      if (VALID_COMMANDS.includes(text)) {
        if (text === 'help') {
          await turnContext.sendActivity({ attachments: [HelpCard] })
        }
        if (text === 'logout') {
          let botAdapter = turnContext.adapter
          await botAdapter.signOutUser(turnContext, CONNECTION_NAME)
          await turnContext.sendActivity('You have been signed out.')
        }
      } else {
        await dialogContext.beginDialog(SIGN_IN_DIALOG)
      }
    } else {
      await dialogContext.continueDialog()
      if (!turnContext.responded && dialogContext.activeDialog) {
        await dialogContext.endDialog()
        await turnContext.sendActivity({ attachments: [ErrorCard, HelpCard] })
      }
    }
  }

  async onActivityEvent (turnContext) {
    const dialogContext = await this.dialogs.createContext(turnContext)
    await dialogContext.continueDialog()
    if (!turnContext.responded) {
      await dialogContext.beginDialog(SIGN_IN_DIALOG)
    }
  }

  async onActivityConversationUpdate (turnContext) {
    const members = turnContext.activity.membersAdded

    for (let index = 0; index < members.length; index++) {
      const member = members[index]
      if (member.id !== turnContext.activity.recipient.id) {
        await turnContext.sendActivity({ attachments: [WelcomeCard, HelpCard] })
      }
    }
  }
}

module.exports.AuthenticationBot = AuthenticationBot
