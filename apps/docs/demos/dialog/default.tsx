import { Button, Dialog, DialogClose, TextField } from '@brand-studio/ui';

export default function DialogDemo() {
  return (
    <Dialog
      trigger={<Button tone="secondary">Edit profile</Button>}
      title="Edit profile"
      description="Changes apply to your next order."
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <TextField label="Name" defaultValue="Sam Rivera" />
        <TextField label="Delivery note" placeholder="Leave by the door" />
      </div>
      <div className="bs-dialog__actions">
        <DialogClose><Button tone="secondary">Cancel</Button></DialogClose>
        <DialogClose><Button>Save</Button></DialogClose>
      </div>
    </Dialog>
  );
}
