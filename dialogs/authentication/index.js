const { ComponentDialog, ChoicePrompt, OAuthPrompt, WaterfallDialog } = require('botbuilder-dialogs');

const AUTHENTICATION_DIALOG = 'authenticationDialog'
const OAUTH_PROMPT = 'oauthPrompt';
const CONFIRM_PROMPT = 'confirmPrompt';
const CONNECTION_NAME = 'Azure Active Directory v2';
const OAUTH_SETTINGS = {
    connectionName: CONNECTION_NAME,
    title: 'Sign In',
    text: 'Please Sign In',
    timeout: 300000 // User has 5 minutes to log in.
};
const HELP_TEXT = ' Type anything to get logged in. Type \'logout\' to signout.' +
    ' Type \'help\' to view this message again';

class AuthenticationDialog extends ComponentDialog {
    constructor(dialogId) {
        super(dialogId);

        if (!dialogId) throw ('Missing parameter.  dialogId is required');

        this.addDialog(new WaterfallDialog(AUTHENTICATION_DIALOG, [
            this.oauthPrompt.bind(this),
            this.loginResults.bind(this),
            this.displayToken.bind(this)
        ]));

        this.addDialog(new ChoicePrompt(CONFIRM_PROMPT));
        this.addDialog(new OAuthPrompt(OAUTH_PROMPT, OAUTH_SETTINGS));
    }

    async oauthPrompt(step) {
        return await step.prompt(OAUTH_PROMPT);
    }

    async loginResults(step) {
        let tokenResponse = step.result;
        if (tokenResponse != null) {
            await step.context.sendActivity('You are now logged in.');
            return await step.prompt(CONFIRM_PROMPT, 'Do you want to view your token?', ['yes', 'no']);
        }

        await step.context.sendActivity('Login was not sucessful please try again');
        return await step.endDialog();
    }

    async displayToken(step) {
        const result = step.result.value;
        if (result === 'yes') {
            let prompt = await step.prompt(OAUTH_PROMPT);
            var tokenResponse = prompt.result;
            if (tokenResponse != null) {
                await step.context.sendActivity(`Here is your token: ${tokenResponse.token}`);
                await step.context.sendActivity(HELP_TEXT);
                return await step.endDialog();
            }
        }

        await step.context.sendActivity(HELP_TEXT);
        return await step.endDialog();
    }
}

exports.AuthenticationDialog = AuthenticationDialog;
exports.AUTHENTICATION_DIALOG = AUTHENTICATION_DIALOG;
exports.HELP_TEXT = HELP_TEXT;
exports.CONNECTION_NAME = CONNECTION_NAME;
