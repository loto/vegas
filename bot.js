require('dotenv').config()
const { ActivityTypes } = require('botbuilder')
const { LuisRecognizer } = require('botbuilder-ai')
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
const LUIS_CONFIGURATION = 'BasicBotLuisApplication'
const INTENT = {
  CANCEL: 'Cancel',
  HELP: 'Help',
  AUTHENTICATION: {
    LOGIN: 'Authentication_Login',
    LOGOUT: 'Authentication_Logout'
  },
  PASSWORD: {
    SHOW: 'Password_Show',
    CHANGE: 'Password_Change'
  }
}

class Bot {
  constructor (conversationState, userState, botConfig) {
    if (!conversationState) throw new Error('Missing parameter.  conversationState is required')
    if (!userState) throw new Error('Missing parameter.  userState is required')
    if (!botConfig) throw new Error('Missing parameter.  botConfig is required')

    const luisConfig = botConfig.findServiceByNameOrId(LUIS_CONFIGURATION)
    if (!luisConfig || !luisConfig.appId) throw new Error('Missing LUIS configuration. Please follow README.MD to create required LUIS applications.\n\n')
    const luisEndpoint = luisConfig.region && luisConfig.region.indexOf('https://') === 0 ? luisConfig.region : luisConfig.getEndpoint()
    this.luisRecognizer = new LuisRecognizer({
      applicationId: luisConfig.appId,
      endpoint: luisEndpoint,
      endpointKey: luisConfig.authoringKey
    })

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
    const results = await this.luisRecognizer.recognize(turnContext)
    const topIntent = LuisRecognizer.topIntent(results)
    const interrupted = await this.isTurnInterrupted(dialogContext, topIntent)

    if (interrupted) {
      if (dialogContext.activeDialog !== undefined) {
        await dialogContext.repromptDialog()
      }
    } else {
      if (!dialogContext.activeDialog) {
        if (topIntent === INTENT.AUTHENTICATION.LOGIN) {
          await dialogContext.beginDialog(SIGN_IN_DIALOG)
        } else if (topIntent === INTENT.AUTHENTICATION.LOGOUT) {
          await dialogContext.beginDialog(SIGN_OUT_DIALOG)
        } else if (topIntent === INTENT.PASSWORD.SHOW) {
          await dialogContext.beginDialog(SHOW_DIALOG)
        } else if (topIntent === INTENT.PASSWORD.CHANGE) {
          await dialogContext.beginDialog(CHANGE_PASSWORD_DIALOG)
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

  async isTurnInterrupted (dialogContext, topIntent) {
    if (topIntent === INTENT.CANCEL) {
      if (dialogContext.activeDialog) {
        await dialogContext.cancelAllDialogs()
        await dialogContext.context.sendActivity(`Ok.  I've cancelled our last activity.`)
      } else {
        await dialogContext.context.sendActivity(`I don't have anything to cancel.`)
      }
      return true
    }

    if (topIntent === INTENT.HELP) {
      await dialogContext.context.sendActivity({ attachments: [HelpCard] })
      return true
    }

    return false
  }
}

module.exports.Bot = Bot
