import { formatAmount, USD_DECIMALS } from "../../Helpers";

function TooltipCard({ title, total, avax, aurora }) {
  return (
    <>
      <p className="Tooltip-row">
        <span className="label">{title} on Aurora:</span>
        <span>${formatAmount(aurora, USD_DECIMALS, 0, true)}</span>
      </p>
      <div className="Tooltip-divider" />
      <p className="Tooltip-row">
        <span className="label">Total:</span>
        <span>${formatAmount(total, USD_DECIMALS, 0, true)}</span>
      </p>
    </>
  );
}

export default TooltipCard;
