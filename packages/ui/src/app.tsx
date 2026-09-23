"use client";

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { Toast as BaseToast } from '@base-ui/react/toast';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { useId } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { useThemeRoot } from './core.js';

/** A modal dialog. Focus moves inside, Escape closes it and focus returns to the trigger. */
export function Dialog({ trigger, title, description, children, closeLabel = 'Close', open, defaultOpen, onOpenChange }: {
  trigger: ReactElement; title: string; description?: string; children?: ReactNode; closeLabel?: string;
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const container = useThemeRoot();
  return <BaseDialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={next => onOpenChange?.(next)}>
    <BaseDialog.Trigger render={trigger} />
    <BaseDialog.Portal container={container}>
      <BaseDialog.Backdrop className="bs-dialog__backdrop" />
      <BaseDialog.Popup className="bs-dialog">
        <BaseDialog.Title className="bs-dialog__title">{title}</BaseDialog.Title>
        {description && <BaseDialog.Description className="bs-dialog__description">{description}</BaseDialog.Description>}
        {children}
        <BaseDialog.Close className="bs-dialog__x" aria-label={closeLabel}><span aria-hidden="true" /></BaseDialog.Close>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}

/** Closes the surrounding Dialog. Pass a button element to style it. */
export function DialogClose({ children }: { children: ReactElement }) {
  return <BaseDialog.Close render={children} />;
}

export interface TabItem { value: string; label: ReactNode; content: ReactNode; disabled?: boolean }

/** Tabbed panels. Arrow keys move between tabs; the underline slides to the selected one. */
export function Tabs({ items, defaultValue, value, onValueChange, className = '', 'aria-label': ariaLabel }: {
  items: TabItem[]; defaultValue?: string; value?: string; onValueChange?: (value: string) => void; className?: string; 'aria-label'?: string;
}) {
  return <BaseTabs.Root className={`bs-tabs ${className}`} defaultValue={defaultValue ?? items[0]?.value} value={value} onValueChange={next => onValueChange?.(next as string)}>
    <BaseTabs.List className="bs-tabs__list" aria-label={ariaLabel}>
      {items.map(item => <BaseTabs.Tab key={item.value} value={item.value} disabled={item.disabled} className="bs-tabs__tab">{item.label}</BaseTabs.Tab>)}
      <BaseTabs.Indicator className="bs-tabs__indicator" />
    </BaseTabs.List>
    {items.map(item => <BaseTabs.Panel key={item.value} value={item.value} className="bs-tabs__panel">{item.content}</BaseTabs.Panel>)}
  </BaseTabs.Root>;
}

export interface SelectOption { value: string; label: string; disabled?: boolean }

/** A labelled single-choice list that opens in a popup. Type to jump to an option. */
export function Select({ label, options, placeholder = 'Select…', defaultValue, value, onValueChange, name, disabled, className = '' }: {
  label: string; options: SelectOption[]; placeholder?: string; defaultValue?: string; value?: string;
  onValueChange?: (value: string) => void; name?: string; disabled?: boolean; className?: string;
}) {
  const container = useThemeRoot();
  return <div className={`bs-select ${className}`}>
    <BaseSelect.Root items={options} defaultValue={defaultValue} value={value} onValueChange={next => onValueChange?.(next as string)} name={name} disabled={disabled}>
      <BaseSelect.Label className="bs-select__label">{label}</BaseSelect.Label>
      <BaseSelect.Trigger className="bs-select__trigger">
        <BaseSelect.Value className="bs-select__value" placeholder={placeholder} />
        <BaseSelect.Icon className="bs-select__icon" />
      </BaseSelect.Trigger>
      <BaseSelect.Portal container={container}>
        <BaseSelect.Positioner className="bs-select__positioner" sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup className="bs-select__popup">
            <BaseSelect.List className="bs-select__list">
              {options.map(option => <BaseSelect.Item key={option.value} value={option.value} disabled={option.disabled} className="bs-select__item">
                <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="bs-select__check" />
              </BaseSelect.Item>)}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  </div>;
}

/** A short label shown on hover or keyboard focus. The trigger must be focusable, such as a button. */
export function Tooltip({ content, children, side = 'top', delay = 300 }: { content: ReactNode; children: ReactElement; side?: 'top' | 'right' | 'bottom' | 'left'; delay?: number }) {
  const container = useThemeRoot();
  return <BaseTooltip.Root>
    <BaseTooltip.Trigger delay={delay} render={children} />
    <BaseTooltip.Portal container={container}>
      <BaseTooltip.Positioner side={side} sideOffset={8} className="bs-tooltip__positioner">
        <BaseTooltip.Popup className="bs-tooltip">{content}<BaseTooltip.Arrow className="bs-tooltip__arrow" /></BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  </BaseTooltip.Root>;
}

/** Hosts toasts for everything inside it. Call `useToast().add({ title, description })` from any child. F6 moves focus to the toasts. */
export function ToastProvider({ children, timeout = 5000, limit = 3, closeLabel = 'Dismiss' }: { children: ReactNode; timeout?: number; limit?: number; closeLabel?: string }) {
  const container = useThemeRoot();
  return <BaseToast.Provider timeout={timeout} limit={limit}>
    {children}
    <BaseToast.Portal container={container}>
      <BaseToast.Viewport className="bs-toasts"><ToastList closeLabel={closeLabel} /></BaseToast.Viewport>
    </BaseToast.Portal>
  </BaseToast.Provider>;
}

function ToastList({ closeLabel }: { closeLabel: string }) {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map(toast => <BaseToast.Root key={toast.id} toast={toast} className="bs-toast">
    <BaseToast.Content className="bs-toast__content">
      <div><BaseToast.Title className="bs-toast__title" /><BaseToast.Description className="bs-toast__description" /></div>
      <BaseToast.Close className="bs-toast__close" aria-label={closeLabel}><span aria-hidden="true" /></BaseToast.Close>
    </BaseToast.Content>
  </BaseToast.Root>);
}

/** Adds and closes toasts inside a ToastProvider. */
export function useToast() {
  const { add, close } = BaseToast.useToastManager();
  return { add: (toast: { title: string; description?: string }) => add(toast), close };
}

/** An on/off control with a visible label. Space toggles it. */
export function Switch({ label, description, checked, defaultChecked, onCheckedChange, disabled, name, className = '' }: {
  label: string; description?: string; checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean; name?: string; className?: string;
}) {
  const id = useId();
  return <div className={`bs-switch ${className}`}>
    <BaseSwitch.Root id={id} nativeButton render={<button type="button" />} className="bs-switch__track" checked={checked} defaultChecked={defaultChecked} onCheckedChange={next => onCheckedChange?.(next)} disabled={disabled} name={name} aria-describedby={description ? `${id}-description` : undefined}>
      <BaseSwitch.Thumb className="bs-switch__thumb" />
    </BaseSwitch.Root>
    <div><label htmlFor={id} className="bs-switch__label">{label}</label>{description && <p id={`${id}-description`} className="bs-switch__description">{description}</p>}</div>
  </div>;
}

/** A short status or category label. */
export function Badge({ tone = 'neutral', className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'accent' | 'outline' }) {
  return <span {...props} className={`bs-badge bs-badge--${tone} ${className}`} />;
}

/** A bordered surface with an optional title, description and footer. */
export function Card({ title, description, footer, children, className = '', ...props }: Omit<HTMLAttributes<HTMLElement>, 'title'> & { title?: ReactNode; description?: ReactNode; footer?: ReactNode }) {
  return <article {...props} className={`bs-card ${className}`}>
    {(title || description) && <header className="bs-card__header">{title && <h3 className="bs-card__title">{title}</h3>}{description && <p className="bs-card__description">{description}</p>}</header>}
    {children && <div className="bs-card__body">{children}</div>}
    {footer && <footer className="bs-card__footer">{footer}</footer>}
  </article>;
}
