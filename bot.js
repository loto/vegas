const { ActivityTypes } = require('botbuilder')
const { DialogSet } = require('botbuilder-dialogs')
const { WelcomeCard } = require('./cards/welcome')
const { HelpCard } = require('./cards/help')
const { ErrorCard } = require('./cards/error')
const {
  SignInDialog,
  SIGN_IN_DIALOG,
  SignOutDialog,
  SIGN_OUT_DIALOG
} = require('./dialogs/authentication')
const {
  ShowPasswordDialog,
  SHOW_DIALOG,
  ChangePasswordDialog,
  CHANGE_PASSWORD_DIALOG
} = require('./dialogs/password')
const VALID_COMMANDS = ['logout', 'help', 'show password', 'change password', 'cancel']

class Bot {
  constructor (conversationState, userState) {
    if (!conversationState) throw new Error('Missing parameter.  conversationState is required')
    if (!userState) throw new Error('Missing parameter.  userState is required')

    this.userSessionAccessor = userState.createProperty('userSessionAccessor')
    this.dialogState = conversationState.createProperty('dialogState')

    this.dialogs = new DialogSet(this.dialogState)
    this.dialogs.add(new SignInDialog(SIGN_IN_DIALOG, this.userSessionAccessor))
    this.dialogs.add(new SignOutDialog(SIGN_OUT_DIALOG, this.userSessionAccessor))
    this.dialogs.add(new ShowPasswordDialog(SHOW_DIALOG, this.userSessionAccessor))
    this.dialogs.add(new ChangePasswordDialog(CHANGE_PASSWORD_DIALOG, this.userSessionAccessor))

    this.conversationState = conversationState
    this.userState = userState
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
    await this.userState.saveChanges(turnContext)
  }

  async onActivityMessage (turnContext) {
    const dialogContext = await this.dialogs.createContext(turnContext)
    const text = turnContext.activity.text
    const interrupted = await this.isTurnInterrupted(dialogContext, text)

    if (interrupted) {
      if (dialogContext.activeDialog !== undefined) {
        await dialogContext.repromptDialog()
      }
    } else {
      if (!dialogContext.activeDialog) {
        if (VALID_COMMANDS.includes(text)) {
          if (text === 'logout') {
            await dialogContext.beginDialog(SIGN_OUT_DIALOG)
          }
          if (text === 'show password') {
            await dialogContext.beginDialog(SHOW_DIALOG)
          }
          if (text === 'change password') {
            await dialogContext.beginDialog(CHANGE_PASSWORD_DIALOG)
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

  async isTurnInterrupted (dialogContext, text) {
    if (text === 'cancel') {
      if (dialogContext.activeDialog) {
        await dialogContext.cancelAllDialogs()
        await dialogContext.context.sendActivity(`Ok.  I've cancelled our last activity.`)
      } else {
        await dialogContext.context.sendActivity(`I don't have anything to cancel.`)
      }
      return true
    }

    if (text === 'help') {
      await dialogContext.context.sendActivity({ attachments: [HelpCard] })
      return true
    }

    return false
  }
}

module.exports.Bot = Bot
