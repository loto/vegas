const {
  ComponentDialog,
  ChoicePrompt,
  OAuthPrompt,
  WaterfallDialog
} = require('botbuilder-dialogs')
const { OAUTH_SETTINGS } = require('./config')
const { UserSession } = require('./userSession')

const SIGN_IN_DIALOG = 'signInDialog'
const OAUTH_PROMPT = 'oauthPrompt'
const CONFIRM_PROMPT = 'confirmPrompt'

class SignInDialog extends ComponentDialog {
  constructor (dialogId, userSessionAccessor) {
    super(dialogId)

    if (!dialogId) throw new Error('Missing parameter.  dialogId is required')
    if (!userSessionAccessor) throw new Error('Missing parameter.  userSessionAccessor is required')

    this.addDialog(
      new WaterfallDialog(SIGN_IN_DIALOG, [
        this.oauthPrompt.bind(this),
        this.loginResults.bind(this),
        this.displayToken.bind(this)
      ])
    )

    this.addDialog(new ChoicePrompt(CONFIRM_PROMPT))
    this.addDialog(new OAuthPrompt(OAUTH_PROMPT, OAUTH_SETTINGS))

    this.userSessionAccessor = userSessionAccessor
  }

  async oauthPrompt (step) {
    return step.prompt(OAUTH_PROMPT)
  }

  async loginResults (step) {
    let tokenResponse = step.result
    if (tokenResponse != null) {
      if (step.options && step.options.userSessionAccessor) {
        await this.userSessionAccessor.set(step.context, step.options.userSessionAccessor)
      } else {
        await this.userSessionAccessor.set(step.context, new UserSession())
      }

      await step.context.sendActivity('You are now logged in.')
      return step.prompt(CONFIRM_PROMPT, 'Do you want to view your token?', ['Yes', 'No'])
    }

    await step.context.sendActivity('Login was not sucessful please try again')
    return step.endDialog()
  }

  async displayToken (step) {
    const result = step.result.value
    if (result === 'Yes') {
      let prompt = await step.prompt(OAUTH_PROMPT)
      var tokenResponse = prompt.result
      if (tokenResponse != null) { await step.context.sendActivity(`Here is your token: ${tokenResponse.token}`) }
    }

    return step.endDialog()
  }
}

exports.SignInDialog = SignInDialog
exports.SIGN_IN_DIALOG = SIGN_IN_DIALOG
