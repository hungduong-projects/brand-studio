import { Button, Dialog, DialogClose } from '@brand-studio/ui';

export default function DialogConfirm() {
  return (
    <Dialog
      trigger={<Button>Cancel subscription</Button>}
      title="Cancel your subscription?"
      description="Your last bag ships on Friday. You can restart any time."
    >
      <div className="bs-dialog__actions">
        <DialogClose><Button tone="secondary">Keep it</Button></DialogClose>
        <DialogClose><Button>Cancel subscription</Button></DialogClose>
      </div>
    </Dialog>
  );
}
