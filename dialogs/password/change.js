const {
  ComponentDialog,
  ChoicePrompt,
  WaterfallDialog,
  TextPrompt
} = require('botbuilder-dialogs')

const CHANGE_DIALOG = 'changeDialog'
const CONFIRM_PROMPT = 'confirmPrompt'
const NEW_PROMPT = 'newPrompt'

class ChangeDialog extends ComponentDialog {
  constructor (dialogId, userSessionAccessor) {
    super(dialogId)

    if (!dialogId) throw new Error('Missing parameter.  dialogId is required')
    if (!userSessionAccessor) throw new Error('Missing parameter.  userSessionAccessor is required')

    this.addDialog(
      new WaterfallDialog(CHANGE_DIALOG, [
        this.confirmPrompt.bind(this),
        this.passwordPrompt.bind(this),
        this.savePassword.bind(this)
      ])
    )

    this.addDialog(new ChoicePrompt(CONFIRM_PROMPT))
    this.addDialog(new TextPrompt(NEW_PROMPT))

    this.userSessionAccessor = userSessionAccessor
  }

  async confirmPrompt (step) {
    let userSession = await this.userSessionAccessor.get(step.context)
    if (userSession === undefined) {
      await step.context.sendActivity(`You need to be signed in to change your password.`)
      return step.endDialog()
    }

    return step.prompt(CONFIRM_PROMPT, 'Do you really want to change your password?', ['Yes', 'No'])
  }

  async passwordPrompt (step) {
    const result = step.result.value
    if (result === 'Yes') {
      return step.prompt(NEW_PROMPT, 'Please enter your new password')
    }
    return step.endDialog()
  }

  async savePassword (step) {
    let userSession = await this.userSessionAccessor.get(step.context)
    userSession.password = step.result
    await this.userSessionAccessor.set(step.context, userSession)
    await step.context.sendActivity('You have successfuly changed your password.')

    return step.endDialog()
  }
}

exports.ChangeDialog = ChangeDialog
exports.CHANGE_DIALOG = CHANGE_DIALOG
