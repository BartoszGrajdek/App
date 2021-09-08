import React from 'react';
import lodashGet from 'lodash/get';
import _ from 'underscore';
import {View, ScrollView} from 'react-native';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import styles from '../../styles/styles';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import CONST from '../../CONST';
import TextLink from '../../components/TextLink';
import Navigation from '../../libs/Navigation/Navigation';
import CheckboxWithLabel from '../../components/CheckboxWithLabel';
import Text from '../../components/Text';
import {
    goToWithdrawalAccountSetupStep,
    setupWithdrawalAccount,
    showBankAccountErrorModal,
    updateReimbursementAccountDraft,
} from '../../libs/actions/BankAccounts';
import Button from '../../components/Button';
import FixedFooter from '../../components/FixedFooter';
import IdentityForm from './IdentityForm';
import {isValidIdentity} from '../../libs/ValidationUtils';
import Onfido from '../../components/Onfido';
import compose from '../../libs/compose';
import ONYXKEYS from '../../ONYXKEYS';

const propTypes = {
    /** Bank account currently in setup */
    reimbursementAccount: PropTypes.shape({
        /** Error set when handling the API response */
        error: PropTypes.string,
    }).isRequired,

    ...withLocalizePropTypes,
};

class RequestorStep extends React.Component {
    constructor(props) {
        super(props);

        this.submit = this.submit.bind(this);
        this.debouncedUpdateReimbursementAccountDraft = _.debounce(this.debouncedUpdateReimbursementAccountDraft.bind(this), 100, false);

        this.state = {
            firstName: lodashGet(props, ['reimbursementAccountDraft', 'firstName']) || lodashGet(props, ['achData', 'firstName'], ''),
            lastName: lodashGet(props, ['reimbursementAccountDraft', 'lastName']) || lodashGet(props, ['achData', 'lastName'], ''),
            requestorAddressStreet: lodashGet(props, ['reimbursementAccountDraft', 'requestorAddressStreet']) || lodashGet(props, ['achData', 'requestorAddressStreet'], ''),
            requestorAddressCity: lodashGet(props, ['reimbursementAccountDraft', 'requestorAddressCity']) || lodashGet(props, ['achData', 'requestorAddressCity'], ''),
            requestorAddressState: lodashGet(props, ['reimbursementAccountDraft', 'requestorAddressState']) || lodashGet(props, ['achData', 'requestorAddressState'], ''),
            requestorAddressZipCode: lodashGet(props, ['reimbursementAccountDraft', 'requestorAddressZipCode']) || lodashGet(props, ['achData', 'requestorAddressZipCode'], ''),
            dob: lodashGet(props, ['reimbursementAccountDraft', 'dob']) || lodashGet(props, ['achData', 'dob'], ''),
            ssnLast4: lodashGet(props, ['reimbursementAccountDraft', 'ssnLast4']) || lodashGet(props, ['achData', 'ssnLast4'], ''),
            isControllingOfficer: lodashGet(props, ['reimbursementAccountDraft', 'isControllingOfficer']) || lodashGet(props, ['achData', 'isControllingOfficer'], false),
            onfidoData: lodashGet(props, ['achData', 'onfidoData'], ''),
            isOnfidoSetupComplete: lodashGet(props, ['achData', 'isOnfidoSetupComplete'], false),
        };

        this.requiredFields = [
            'firstName',
            'lastName',
            'requestorAddressStreet',
            'requestorAddressCity',
            'requestorAddressZipCode',
            'dob',
            'ssnLast4',
            'requestorAddressState',
        ];
    }

    onFieldChange(field, value) {
        const renamedFields = {
            street: 'requestorAddressStreet',
            city: 'requestorAddressCity',
            state: 'requestorAddressState',
            zipCode: 'requestorAddressZipCode',
        };
        const fieldName = lodashGet(renamedFields, field, field);
        const newState = {[fieldName]: value};
        this.setState(newState);
        this.debouncedUpdateReimbursementAccountDraft(newState);
    }

    /**
    * Save the input value in Onyx. We debounce this method in the constructor so that it's not called too often
    * to update Onyx and re-render this component.
    *
    * @param {Object} value
    */
    debouncedUpdateReimbursementAccountDraft(value) {
        updateReimbursementAccountDraft(value);
    }

    /**
     * @returns {Boolean}
     */
    validate() {
        if (!this.state.isControllingOfficer) {
            showBankAccountErrorModal(this.props.translate('requestorStep.isControllingOfficerError'));
            return false;
        }

        if (!isValidIdentity({
            street: this.state.requestorAddressStreet,
            state: this.state.requestorAddressState,
            zipCode: this.state.requestorAddressZipCode,
            dob: this.state.dob,
            ssnLast4: this.state.ssnLast4,
        })) {
            return false;
        }

        return true;
    }

    submit() {
        if (!this.validate()) {
            return;
        }
        setupWithdrawalAccount({...this.state});
    }

    render() {
        const shouldDisableSubmitButton = this.requiredFields
            .reduce((acc, curr) => acc || !this.state[curr].trim(), false) || !this.state.isControllingOfficer;

        return (
            <>
                <HeaderWithCloseButton
                    title={this.props.translate('requestorStep.headerTitle')}
                    shouldShowBackButton
                    onBackButtonPress={() => goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.COMPANY)}
                    onCloseButtonPress={Navigation.dismissModal}
                />
                {this.props.achData.useOnfido && this.props.achData.sdkToken ? (
                    <Onfido
                        sdkToken={this.props.achData.sdkToken}
                        onUserExit={() => {
                            goToWithdrawalAccountSetupStep(CONST.BANK_ACCOUNT.STEP.REQUESTOR);
                        }}
                        onSuccess={(onfidoData) => {
                            this.setState({
                                onfidoData,
                                isOnfidoSetupComplete: true,
                            }, this.submit);
                        }}
                    />
                ) : (
                    <>
                        <ScrollView style={[styles.flex1, styles.w100]}>
                            <View style={[styles.p4]}>
                                <IdentityForm
                                    onFieldChange={(field, value) => this.onFieldChange(field, value)}
                                    values={{
                                        firstName: this.state.firstName,
                                        lastName: this.state.lastName,
                                        street: this.state.requestorAddressStreet,
                                        city: this.state.requestorAddressCity,
                                        state: this.state.requestorAddressState,
                                        zipCode: this.state.requestorAddressZipCode,
                                        dob: this.state.dob,
                                        ssnLast4: this.state.ssnLast4,
                                    }}
                                    error={this.props.reimbursementAccount.error}
                                />
                                <CheckboxWithLabel
                                    isChecked={this.state.isControllingOfficer}
                                    onPress={() => this.setState((prevState) => {
                                        const newState = {isControllingOfficer: !prevState.isControllingOfficer};
                                        this.debouncedUpdateReimbursementAccountDraft(newState);
                                        return newState;
                                    })}
                                    LabelComponent={() => (
                                        <View style={[styles.flex1, styles.pr1]}>
                                            <Text>
                                                {this.props.translate('requestorStep.isControllingOfficer')}
                                            </Text>
                                        </View>
                                    )}
                                    style={[styles.mt4]}
                                />
                                <Text style={[styles.textMicroSupporting, styles.mt5]}>
                                    {this.props.translate('requestorStep.financialRegulations')}
                                    <TextLink
                                        style={styles.textMicro}
                                        // eslint-disable-next-line max-len
                                        href="https://community.expensify.com/discussion/6983/faq-why-do-i-need-to-provide-personal-documentation-when-setting-up-updating-my-bank-account"
                                    >
                                        {`${this.props.translate('requestorStep.learnMore')}`}
                                    </TextLink>
                                    {' | '}
                                    <TextLink
                                        style={styles.textMicro}
                                        // eslint-disable-next-line max-len
                                        href="https://community.expensify.com/discussion/5677/deep-dive-security-how-expensify-protects-your-information"
                                    >
                                        {`${this.props.translate('requestorStep.isMyDataSafe')}`}
                                    </TextLink>
                                </Text>
                                <Text style={[styles.mt3, styles.textMicroSupporting]}>
                                    {this.props.translate('requestorStep.onFidoConditions')}
                                    <TextLink
                                        style={styles.textMicro}
                                        href="https://onfido.com/facial-scan-policy-and-release/"
                                    >
                                        {`${this.props.translate('requestorStep.onFidoFacialScan')}`}
                                    </TextLink>
                                    {', '}
                                    <TextLink
                                        style={styles.textMicro}
                                        href="https://onfido.com/privacy/"
                                    >
                                        {`${this.props.translate('common.privacyPolicy')}`}
                                    </TextLink>
                                    {` ${this.props.translate('common.and')} `}
                                    <TextLink
                                        style={styles.textMicro}
                                        href="https://onfido.com/terms-of-service/"
                                    >
                                        {`${this.props.translate('common.termsOfService')}`}
                                    </TextLink>
                                </Text>
                            </View>
                        </ScrollView>
                        <FixedFooter>
                            <Button
                                success
                                onPress={this.submit}
                                style={[styles.w100]}
                                text={this.props.translate('common.saveAndContinue')}
                                isDisabled={shouldDisableSubmitButton}
                            />
                        </FixedFooter>
                    </>
                )}
            </>
        );
    }
}

RequestorStep.propTypes = propTypes;
RequestorStep.displayName = 'RequestorStep';

export default compose(
    withLocalize,
    withOnyx({
        reimbursementAccount: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
        },
        reimbursementAccountDraft: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT_DRAFT,
        },
    }),
)(RequestorStep);
