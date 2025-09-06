/**
 * Tests for EventEmitter
 */

import { EventEmitter } from '../event-emitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on() and emit()', () => {
    it('should register and call event handlers', () => {
      const handler = jest.fn();
      emitter.on('ON_REQUEST', handler);
      
      emitter.emit('ON_REQUEST', 'test-data');
      
      expect(handler).toHaveBeenCalledWith('test-data');
    });

    it('should support multiple handlers for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on('ON_REQUEST', handler1);
      emitter.on('ON_REQUEST', handler2);
      
      emitter.emit('ON_REQUEST', 'test-data');
      
      expect(handler1).toHaveBeenCalledWith('test-data');
      expect(handler2).toHaveBeenCalledWith('test-data');
    });

    it('should call handlers in registration order', () => {
      const callOrder: number[] = [];
      const handler1 = jest.fn(() => callOrder.push(1));
      const handler2 = jest.fn(() => callOrder.push(2));
      
      emitter.on('ON_REQUEST', handler1);
      emitter.on('ON_REQUEST', handler2);
      
      emitter.emit('ON_REQUEST');
      
      expect(callOrder).toEqual([1, 2]);
    });

    it('should handle multiple arguments in emit', () => {
      const handler = jest.fn();
      emitter.on('ON_RESPONSE', handler);
      
      emitter.emit('ON_RESPONSE', 'arg1', 'arg2', 'arg3');
      
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });
  });

  describe('off()', () => {
    it('should remove event handlers and return true', () => {
      const handler = jest.fn();
      emitter.on('ON_REQUEST', handler);
      
      const result = emitter.off('ON_REQUEST', handler);
      
      expect(result).toBe(true);
      emitter.emit('ON_REQUEST', 'test-data');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return false when handler not found', () => {
      const handler = jest.fn();
      
      const result = emitter.off('ON_REQUEST', handler);
      
      expect(result).toBe(false);
    });

    it('should return false for non-existent event', () => {
      const handler = jest.fn();
      
      const result = emitter.off('ON_MOCK', handler);
      
      expect(result).toBe(false);
    });

    it('should only remove the specific handler', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on('ON_REQUEST', handler1);
      emitter.on('ON_REQUEST', handler2);
      
      emitter.off('ON_REQUEST', handler1);
      emitter.emit('ON_REQUEST', 'test-data');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('test-data');
    });
  });

  describe('error handling', () => {
    it('should catch and log handler errors without affecting other handlers', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorHandler = jest.fn(() => { throw new Error('Handler error'); });
      const normalHandler = jest.fn();
      
      emitter.on('ON_REQUEST', errorHandler);
      emitter.on('ON_REQUEST', normalHandler);
      
      emitter.emit('ON_REQUEST', 'test-data');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in event handler for ON_REQUEST:',
        expect.any(Error)
      );
      expect(normalHandler).toHaveBeenCalledWith('test-data');
      
      consoleSpy.mockRestore();
    });
  });

  describe('listenerCount()', () => {
    it('should return correct listener count', () => {
      expect(emitter.listenerCount('ON_REQUEST')).toBe(0);
      
      emitter.on('ON_REQUEST', jest.fn());
      expect(emitter.listenerCount('ON_REQUEST')).toBe(1);
      
      emitter.on('ON_REQUEST', jest.fn());
      expect(emitter.listenerCount('ON_REQUEST')).toBe(2);
    });
  });

  describe('removeAllListeners()', () => {
    it('should remove all listeners for specific event', () => {
      emitter.on('ON_REQUEST', jest.fn());
      emitter.on('ON_REQUEST', jest.fn());
      emitter.on('ON_MOCK', jest.fn());
      
      emitter.removeAllListeners('ON_REQUEST');
      
      expect(emitter.listenerCount('ON_REQUEST')).toBe(0);
      expect(emitter.listenerCount('ON_MOCK')).toBe(1);
    });

    it('should remove all listeners when no event specified', () => {
      emitter.on('ON_REQUEST', jest.fn());
      emitter.on('ON_MOCK', jest.fn());
      
      emitter.removeAllListeners();
      
      expect(emitter.listenerCount('ON_REQUEST')).toBe(0);
      expect(emitter.listenerCount('ON_MOCK')).toBe(0);
    });
  });
});