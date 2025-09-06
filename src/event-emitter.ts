/**
 * Event Emitter for request lifecycle events
 * Extends EventTarget to leverage native browser event handling
 */

import { EventType } from "./types";

export class EventEmitter extends EventTarget {
  private handlerMap: Map<EventType, Map<Function, EventListener>>;

  constructor() {
    super();
    this.handlerMap = new Map();
  }

  /**
   * Subscribe to an event
   */
  on(event: EventType, handler: Function): void {
    if (!this.handlerMap.has(event)) {
      this.handlerMap.set(event, new Map());
    }

    // Create a wrapper that extracts arguments from CustomEvent detail
    const eventListener: EventListener = (e: Event) => {
      try {
        const customEvent = e as CustomEvent;
        const args = customEvent.detail || [];
        handler(...args);
      } catch (error) {
        // Log error but don't affect request processing
        console.error(`Error in event handler for ${event}:`, error);
      }
    };

    // Store the mapping for removal later
    this.handlerMap.get(event)!.set(handler, eventListener);

    // Add to EventTarget
    this.addEventListener(event, eventListener);
  }

  /**
   * Unsubscribe from an event
   * @returns true if handler was found and removed, false otherwise
   */
  off(event: EventType, handler: Function): boolean {
    const eventHandlers = this.handlerMap.get(event);
    if (!eventHandlers) {
      return false;
    }

    const eventListener = eventHandlers.get(handler);
    if (!eventListener) {
      return false;
    }

    // Remove from EventTarget
    this.removeEventListener(event, eventListener);

    // Remove from our mapping
    eventHandlers.delete(handler);

    // Clean up empty maps
    if (eventHandlers.size === 0) {
      this.handlerMap.delete(event);
    }

    return true;
  }

  /**
   * Emit an event to all registered handlers
   */
  emit(event: EventType, ...args: any[]): void {
    // Create a CustomEvent with arguments in the detail
    const customEvent = new CustomEvent(event, {
      detail: args,
    });

    // Dispatch using EventTarget
    this.dispatchEvent(customEvent);
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: EventType): number {
    return this.handlerMap.get(event)?.size ?? 0;
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified
   */
  removeAllListeners(event?: EventType): void {
    if (event) {
      const eventHandlers = this.handlerMap.get(event);
      if (eventHandlers) {
        // Remove all listeners for this event from EventTarget
        eventHandlers.forEach((eventListener) => {
          this.removeEventListener(event, eventListener);
        });
        // Clear our mapping
        this.handlerMap.delete(event);
      }
    } else {
      // Remove all listeners for all events
      this.handlerMap.forEach((eventHandlers, eventType) => {
        eventHandlers.forEach((eventListener) => {
          this.removeEventListener(eventType, eventListener);
        });
      });
      this.handlerMap.clear();
    }
  }
}
