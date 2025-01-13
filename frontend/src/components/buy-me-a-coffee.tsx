import { Button } from "@/components/ui/button"
import { Coffee } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BuyMeCoffeeProps {
  className?: string;
}

const BuyMeCoffee = ({ className }: BuyMeCoffeeProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`bg-background hover:bg-accent text-foreground border border-input transition-colors duration-200 ${className}`}
            onClick={() => window.open('https://buymeacoffee.com/aidenlee11', '_blank')}
          >
            <Coffee className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Support this project</span>
            <span className="sm:hidden">Support this project</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Buy me a coffee!</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default BuyMeCoffee;

