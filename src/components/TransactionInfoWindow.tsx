"use client";

import { InfoWindow } from "@vis.gl/react-google-maps";
import type { Transaction } from "@/types";
import {
  formatPLN,
  formatPricePerSqm,
  formatDate,
  formatArea,
  propertyTypeLabel,
} from "@/lib/formatters";

interface TransactionInfoWindowProps {
  transaction: Transaction;
  onClose: () => void;
}

export function TransactionInfoWindow({
  transaction: t,
  onClose,
}: TransactionInfoWindowProps) {
  return (
    <InfoWindow
      position={{ lat: t.lat, lng: t.lng }}
      onCloseClick={onClose}
      headerDisabled
    >
      <div className="p-1 min-w-[200px] max-w-[280px]">
        <div className="text-lg font-bold text-emerald-700">
          {formatPLN(t.price)}
        </div>
        {t.price_per_sqm && (
          <div className="text-sm text-gray-500">
            {formatPricePerSqm(t.price_per_sqm)}
          </div>
        )}
        <div className="mt-2 space-y-1 text-sm text-gray-700">
          <div className="font-medium">{propertyTypeLabel(t.property_type)}</div>
          {t.area_sqm && <div>{formatArea(t.area_sqm)}</div>}
          {t.rooms && (
            <div>
              {t.rooms} {t.rooms === 1 ? "pokoj" : t.rooms < 5 ? "pokoje" : "pokoi"}
            </div>
          )}
          {t.floor !== null && <div>Pietro: {t.floor}</div>}
          {t.market_type && (
            <div>
              {t.market_type === "primary" ? "Rynek pierwotny" : "Rynek wtorny"}
            </div>
          )}
          <div className="text-gray-400">{formatDate(t.transaction_date)}</div>
          {t.address && (
            <div className="text-gray-400 text-xs mt-1">{t.address}</div>
          )}
        </div>
      </div>
    </InfoWindow>
  );
}
