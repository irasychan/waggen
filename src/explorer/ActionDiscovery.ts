import { Page } from 'playwright';
import { InteractiveElement, ElementType, Action, ActionType, ExplorerConfig } from '../types';

export class ActionDiscovery {
  constructor(private config: ExplorerConfig) {}

  async discoverElements(page: Page): Promise<InteractiveElement[]> {
    const elements: InteractiveElement[] = [];

    // Discover buttons
    const buttons = await this.findButtons(page);
    elements.push(...buttons);

    // Discover links
    const links = await this.findLinks(page);
    elements.push(...links);

    // Discover inputs
    const inputs = await this.findInputs(page);
    elements.push(...inputs);

    // Discover checkboxes
    const checkboxes = await this.findCheckboxes(page);
    elements.push(...checkboxes);

    // Discover select elements
    const selects = await this.findSelects(page);
    elements.push(...selects);

    return elements;
  }

  private async findButtons(page: Page): Promise<InteractiveElement[]> {
    return page.evaluate(() => {
      const buttons: InteractiveElement[] = [];
      const btnElements = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');

      btnElements.forEach((el, index) => {
        if (!isVisible(el)) return;

        const element = el as HTMLElement;
        buttons.push({
          selector: getSelector(element, index, 'button'),
          type: 'button' as const,
          label: getLabel(element),
          tagName: element.tagName.toLowerCase(),
          attributes: getAttributes(element),
        });
      });

      return buttons;

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el as HTMLElement);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function getSelector(el: HTMLElement, index: number, type: string): string {
        if (el.getAttribute('data-testid')) {
          return `[data-testid="${el.getAttribute('data-testid')}"]`;
        }
        if (el.id) {
          return `#${el.id}`;
        }
        if (el.getAttribute('name')) {
          return `[name="${el.getAttribute('name')}"]`;
        }
        return `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
      }

      function getLabel(el: HTMLElement): string {
        return (
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          el.textContent?.trim().slice(0, 50) ||
          el.getAttribute('value') ||
          el.getAttribute('placeholder') ||
          'Unknown'
        );
      }

      function getAttributes(el: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        ['id', 'class', 'name', 'type', 'data-testid', 'aria-label'].forEach(attr => {
          const value = el.getAttribute(attr);
          if (value) attrs[attr] = value;
        });
        return attrs;
      }
    });
  }

  private async findLinks(page: Page): Promise<InteractiveElement[]> {
    return page.evaluate(() => {
      const links: InteractiveElement[] = [];
      const linkElements = document.querySelectorAll('a[href]');

      linkElements.forEach((el, index) => {
        if (!isVisible(el)) return;

        const element = el as HTMLAnchorElement;
        links.push({
          selector: getSelector(element, index, 'link'),
          type: 'link' as const,
          label: getLabel(element),
          tagName: 'a',
          attributes: getAttributes(element),
        });
      });

      return links;

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el as HTMLElement);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function getSelector(el: HTMLElement, index: number, type: string): string {
        if (el.getAttribute('data-testid')) {
          return `[data-testid="${el.getAttribute('data-testid')}"]`;
        }
        if (el.id) {
          return `#${el.id}`;
        }
        return `a:nth-of-type(${index + 1})`;
      }

      function getLabel(el: HTMLElement): string {
        return (
          el.getAttribute('aria-label') ||
          el.textContent?.trim().slice(0, 50) ||
          (el as HTMLAnchorElement).href ||
          'Unknown'
        );
      }

      function getAttributes(el: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        ['id', 'class', 'href', 'data-testid', 'aria-label'].forEach(attr => {
          const value = el.getAttribute(attr);
          if (value) attrs[attr] = value;
        });
        return attrs;
      }
    });
  }

  private async findInputs(page: Page): Promise<InteractiveElement[]> {
    return page.evaluate(() => {
      const inputs: InteractiveElement[] = [];
      const inputElements = document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea');

      inputElements.forEach((el, index) => {
        if (!isVisible(el)) return;

        const element = el as HTMLInputElement;
        inputs.push({
          selector: getSelector(element, index, 'input'),
          type: 'input' as const,
          label: getLabel(element),
          tagName: element.tagName.toLowerCase(),
          attributes: getAttributes(element),
        });
      });

      return inputs;

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el as HTMLElement);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function getSelector(el: HTMLElement, index: number, type: string): string {
        if (el.getAttribute('data-testid')) {
          return `[data-testid="${el.getAttribute('data-testid')}"]`;
        }
        if (el.id) {
          return `#${el.id}`;
        }
        if (el.getAttribute('name')) {
          return `[name="${el.getAttribute('name')}"]`;
        }
        return `input:nth-of-type(${index + 1})`;
      }

      function getLabel(el: HTMLElement): string {
        const input = el as HTMLInputElement;
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        return (
          labelEl?.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('placeholder') ||
          el.getAttribute('name') ||
          input.type ||
          'Unknown'
        );
      }

      function getAttributes(el: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        ['id', 'class', 'name', 'type', 'placeholder', 'data-testid', 'aria-label'].forEach(attr => {
          const value = el.getAttribute(attr);
          if (value) attrs[attr] = value;
        });
        return attrs;
      }
    });
  }

  private async findCheckboxes(page: Page): Promise<InteractiveElement[]> {
    return page.evaluate(() => {
      const checkboxes: InteractiveElement[] = [];
      const checkboxElements = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');

      checkboxElements.forEach((el, index) => {
        if (!isVisible(el)) return;

        const element = el as HTMLInputElement;
        checkboxes.push({
          selector: getSelector(element, index, 'checkbox'),
          type: 'checkbox' as const,
          label: getLabel(element),
          tagName: 'input',
          attributes: getAttributes(element),
        });
      });

      return checkboxes;

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el as HTMLElement);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function getSelector(el: HTMLElement, index: number, type: string): string {
        if (el.getAttribute('data-testid')) {
          return `[data-testid="${el.getAttribute('data-testid')}"]`;
        }
        if (el.id) {
          return `#${el.id}`;
        }
        if (el.getAttribute('name')) {
          return `[name="${el.getAttribute('name')}"]`;
        }
        return `input[type="checkbox"]:nth-of-type(${index + 1})`;
      }

      function getLabel(el: HTMLElement): string {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        const parent = el.parentElement;
        return (
          labelEl?.textContent?.trim() ||
          parent?.textContent?.trim().slice(0, 50) ||
          el.getAttribute('aria-label') ||
          'Checkbox'
        );
      }

      function getAttributes(el: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        ['id', 'class', 'name', 'type', 'checked', 'data-testid', 'aria-label'].forEach(attr => {
          const value = el.getAttribute(attr);
          if (value !== null) attrs[attr] = value;
        });
        return attrs;
      }
    });
  }

  private async findSelects(page: Page): Promise<InteractiveElement[]> {
    return page.evaluate(() => {
      const selects: InteractiveElement[] = [];
      const selectElements = document.querySelectorAll('select');

      selectElements.forEach((el, index) => {
        if (!isVisible(el)) return;

        const element = el as HTMLSelectElement;
        selects.push({
          selector: getSelector(element, index, 'select'),
          type: 'select' as const,
          label: getLabel(element),
          tagName: 'select',
          attributes: getAttributes(element),
        });
      });

      return selects;

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el as HTMLElement);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function getSelector(el: HTMLElement, index: number, type: string): string {
        if (el.getAttribute('data-testid')) {
          return `[data-testid="${el.getAttribute('data-testid')}"]`;
        }
        if (el.id) {
          return `#${el.id}`;
        }
        if (el.getAttribute('name')) {
          return `[name="${el.getAttribute('name')}"]`;
        }
        return `select:nth-of-type(${index + 1})`;
      }

      function getLabel(el: HTMLElement): string {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        return (
          labelEl?.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('name') ||
          'Select'
        );
      }

      function getAttributes(el: HTMLElement): Record<string, string> {
        const attrs: Record<string, string> = {};
        ['id', 'class', 'name', 'data-testid', 'aria-label'].forEach(attr => {
          const value = el.getAttribute(attr);
          if (value) attrs[attr] = value;
        });
        return attrs;
      }
    });
  }

  generateActionsForElement(element: InteractiveElement): Action[] {
    const actions: Action[] = [];

    switch (element.type) {
      case 'button':
      case 'link':
        actions.push({
          type: 'click',
          elementSelector: element.selector,
          elementLabel: element.label,
        });
        break;

      case 'input':
        const inputType = element.attributes.type || 'text';
        const value = this.config.inputValues[inputType] || this.config.inputValues.text;
        actions.push({
          type: 'input',
          elementSelector: element.selector,
          elementLabel: element.label,
          value,
        });
        break;

      case 'checkbox':
        actions.push({
          type: 'check',
          elementSelector: element.selector,
          elementLabel: element.label,
        });
        break;

      case 'select':
        actions.push({
          type: 'select',
          elementSelector: element.selector,
          elementLabel: element.label,
          value: '0', // Select first option
        });
        break;
    }

    return actions;
  }
}
