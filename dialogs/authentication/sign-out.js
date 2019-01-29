const {
  ComponentDialog,
  ChoicePrompt,
  WaterfallDialog
} = require('botbuilder-dialogs')
const { CONNECTION_NAME } = require('./config')

const SIGN_OUT_DIALOG = 'signOutDialog'
const CONFIRM_PROMPT = 'confirmPrompt'

class SignOutDialog extends ComponentDialog {
  constructor (dialogId, userSessionAccessor) {
    super(dialogId)

    if (!dialogId) throw new Error('Missing parameter.  dialogId is required')
    if (!userSessionAccessor) throw new Error('Missing parameter.  userSessionAccessor is required')

    this.addDialog(
      new WaterfallDialog(SIGN_OUT_DIALOG, [
        this.confirmPrompt.bind(this),
        this.logout.bind(this)
      ])
    )

    this.addDialog(new ChoicePrompt(CONFIRM_PROMPT))

    this.userSessionAccessor = userSessionAccessor
  }

  async confirmPrompt (step) {
    return step.prompt(CONFIRM_PROMPT, 'Do you really want to logout?', ['Yes', 'No'])
  }

  async logout (step) {
    const result = step.result.value
    if (result === 'Yes') {
      let turnContext = step.context
      let botAdapter = turnContext.adapter
      await botAdapter.signOutUser(turnContext, CONNECTION_NAME)
      await turnContext.sendActivity('You have been signed out.')

      await this.userSessionAccessor.set(step.context, undefined)
    }

    return step.endDialog()
  }
}

exports.SignOutDialog = SignOutDialog
exports.SIGN_OUT_DIALOG = SIGN_OUT_DIALOG
