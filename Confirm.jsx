import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export const ConfirmDelete = ({ label = "Delete", title = "Pakka delete karna hai?", description = "Ye data wapas nahi aayega.", onConfirm, testid }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        data-testid={testid}
      >
        {label}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid="delete-cancel-btn">Nahi</AlertDialogCancel>
        <AlertDialogAction
          data-testid="delete-confirm-btn"
          onClick={onConfirm}
          className="bg-rose-600 hover:bg-rose-700 text-white"
        >
          Haan, delete karo
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
