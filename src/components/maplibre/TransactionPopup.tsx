"use client";

import { Popup } from "react-map-gl/maplibre";
import type { Transaction } from "@/types";
import {
  formatPLN,
  formatPricePerSqm,
  formatDate,
  formatArea,
} from "@/lib/formatters";

interface TransactionPopupProps {
  transaction: Transaction;
  onClose: () => void;
  onCompare?: (transaction: Transaction) => void;
}

const transactionTypeLabels: Record<string, string> = {
  wolnyRynek: "Wolny rynek",
  przetarg: "Przetarg",
  zamiana: "Zamiana",
  darowizna: "Darowizna",
  inny: "Inny",
};

const partyLabels: Record<string, string> = {
  osobaFizyczna: "Osoba fizyczna",
  osobaPrawna: "Osoba prawna",
  jednostkaSamorz: "Jednostka samorz.",
  skarbPanstwa: "Skarb Panstwa",
};

const rightLabels: Record<string, string> = {
  wlasnoscLokaluWrazZPrawemZwiazanym: "Wlasnosc lokalu",
  wlasnosc: "Wlasnosc",
  uzytkowanieWieczyste: "Uzytkowanie wieczyste",
  spoldzielczePrawoWlasnosciowe: "Spoldzielcze wlasnosciowe",
};

const functionLabels: Record<string, string> = {
  mieszkalna: "Mieszkalna",
  garaz: "Garaz",
  inne: "Inne",
  handlowoUslugowa: "Handlowo-uslugowa",
};

export function TransactionPopup({
  transaction: t,
  onClose,
  onCompare,
}: TransactionPopupProps) {
  return (
    <Popup
      longitude={t.lng}
      latitude={t.lat}
      anchor="bottom"
      onClose={onClose}
      closeButton={false}
      maxWidth="300px"
    >
      <div className="p-1 min-w-[220px] max-w-[300px] relative pr-6">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 text-lg leading-none"
          aria-label="Close"
        >
          &times;
        </button>
        <div className="text-lg font-bold text-emerald-700">
          {formatPLN(t.price)}
        </div>
        {t.price_per_sqm && (
          <div className="text-sm text-gray-500">
            {formatPricePerSqm(t.price_per_sqm)}
          </div>
        )}

        <div className="mt-2 space-y-0.5 text-sm text-gray-700">
          {t.area_sqm && <div>{formatArea(t.area_sqm)}</div>}
          {t.rooms && (
            <div>
              {t.rooms} {t.rooms === 1 ? "pokoj" : t.rooms < 5 ? "pokoje" : "pokoi"}
            </div>
          )}
          {t.floor !== null && <div>Pietro: {t.floor}</div>}
          {t.ancillary_area_sqm && (
            <div>Pow. przynalezna: {formatArea(t.ancillary_area_sqm)}</div>
          )}
          {t.apartment_number && (
            <div>Lokal: {t.apartment_number}</div>
          )}
        </div>

        <div className="mt-2 space-y-0.5 text-xs text-gray-500">
          {t.market_type && (
            <div>{t.market_type === "primary" ? "Rynek pierwotny" : "Rynek wtorny"}</div>
          )}
          {t.transaction_type && (
            <div>{transactionTypeLabels[t.transaction_type] || t.transaction_type}</div>
          )}
          {t.function_type && (
            <div>{functionLabels[t.function_type] || t.function_type}</div>
          )}
          {t.property_right && (
            <div>{rightLabels[t.property_right] || t.property_right}</div>
          )}
          {t.share_fraction && t.share_fraction !== "1/1" && (
            <div>Udzial: {t.share_fraction}</div>
          )}
          {t.seller_type && t.buyer_type && (
            <div>
              {partyLabels[t.seller_type] || t.seller_type} → {partyLabels[t.buyer_type] || t.buyer_type}
            </div>
          )}
          {t.building_type && (
            <div>Rodzaj budynku: {t.building_type}</div>
          )}
          {t.zoning && (
            <div>MPZP: {t.zoning}</div>
          )}
          {t.land_use && (
            <div>Uzytkowanie: {t.land_use}</div>
          )}
          {t.additional_info && (
            <div className="italic">{t.additional_info}</div>
          )}
        </div>

        <div className="mt-2 text-gray-400 text-xs">
          {formatDate(t.transaction_date)}
        </div>
        {t.address && (
          <div className="text-gray-400 text-xs">{t.address}</div>
        )}
        {onCompare && t.price_per_sqm && (
          <button
            onClick={() => onCompare(t)}
            className="mt-2 w-full text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors"
          >
            Porownaj z podobnymi
          </button>
        )}
      </div>
    </Popup>
  );
}
