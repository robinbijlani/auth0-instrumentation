//@ts-check

'use strict';

const assert = require('assert');
const sentry = require('../lib/error_reporter')({}, {});
const logger = require('../lib/logger')({ name: 'test' },
  {
    service: {
      name: 'test',
      channel: 'testing',
      purpose: 'test-purpose',
      environment: 'test-env',
      region: 'test-region'
    },
    logger: {
      streams: [{ type: 'console', level: 'fatal' }]
    },
    flags: {
      isProduction: false,
      ignoreProcessInfo: true
    }
  }, {}, {});
const spy = require('sinon').spy;

describe('logger', function () {
  beforeEach(function () {
    sentry.captureException = spy();
    sentry.captureMessage = spy();
    sentry.captureException.resetHistory();
    sentry.captureMessage.resetHistory();
  });

  describe('logger.child()', function () {
    it('should support creating child loggers', function () {
      const childLogger = logger.child({
        child: 'child'
      });

      childLogger.error({
        log_type: 'not really an error'
      }, 'test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
      assert(sentry.captureMessage.getCall(0).args[1].tags.log_type, 'not really an error');
      assert(sentry.captureMessage.getCall(0).args[1].extra.child, 'child');
    });

    it('should support creating nested child loggers', function () {
      const childLogger = logger.child({
        child: 'child'
      });
      const grandChildLogger = childLogger.child({
        child: 'grandchild',
        parent: 'child',
      });

      grandChildLogger.error({
        log_type: 'not really an error'
      }, 'test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
      assert(sentry.captureMessage.getCall(0).args[1].tags.log_type, 'not really an error');
      assert(sentry.captureMessage.getCall(0).args[1].extra.child, 'grandchild');
      assert(sentry.captureMessage.getCall(0).args[1].extra.parent, 'child');
    });
  });

  describe('SentryStream', function () {
    it('should call captureException on error when level is error', function () {
      logger.error(new Error('test'));
      assert(sentry.captureException.calledOnce);
      assert(sentry.captureMessage.calledOnce === false);
    });

    it('should call captureMessage on string when level is error', function () {
      logger.error('test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
    });

    it('should add a log_type tag when the log entry has an error and has a log_type property', function () {
      logger.error({
        log_type: 'uncaughtException',
        err: new Error('test err')
      }, 'test');
      assert(sentry.captureException.calledOnce);
      assert(sentry.captureMessage.calledOnce === false);
      assert(sentry.captureException.getCall(0).args[1].tags.log_type, 'uncaughtException');
    });

    it('should add a log_type tag when the log entry does not have an error and has a log_type property', function () {
      logger.error({
        log_type: 'not really an error'
      }, 'test');
      assert(sentry.captureException.calledOnce === false);
      assert(sentry.captureMessage.calledOnce);
      assert(sentry.captureMessage.getCall(0).args[1].tags.log_type, 'not really an error');
    });
  });

  it('should add default values from environment', function () {
    logger.error('testing');
    assert(sentry.captureException.calledOnce === false);
    assert(sentry.captureMessage.calledOnce);
    const captured = sentry.captureMessage.getCall(0).args[1];
    assert.equal(captured.extra.purpose, 'test-purpose');
    assert.equal(captured.extra.environment, 'test-env');
    assert.equal(captured.extra.region, 'test-region');
  });

});
