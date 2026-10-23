import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePrivacyDocument, privacyPublicationError, PRIVACY_REVIEW_DRAFT } from '../src/lib/privacy-document-rules';
test('unfinished operator draft cannot be published', () => assert.ok(privacyPublicationError(PRIVACY_REVIEW_DRAFT)));
test('corrupt data is not treated as an approved document', () => { assert.equal(parsePrivacyDocument('{}'), null); assert.equal(parsePrivacyDocument('bad'), null); });
test('all required disclosure categories must be reviewed', () => assert.ok(privacyPublicationError('일반 안내문')));
