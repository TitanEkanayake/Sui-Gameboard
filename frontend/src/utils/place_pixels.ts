// import { TransactionBlock } from "@mysten/sui.js/transactions";
import { TransactionBlock } from "ethos-connect";
import { PACKAGE_ID, PLACE_ID } from "../deployed_objects.json";

export const get_set_pixel_trx = (
  x: number,
  y: number,
  color: number
): TransactionBlock => {
  const trx = new TransactionBlock();
  trx.moveCall({
    target: `${PACKAGE_ID}::my_module::set_pixel_at`,
    arguments: [
      trx.object(PLACE_ID),
      trx.pure(x),
      trx.pure(y),
      trx.pure(color),
    ],
  });
  return trx;
};
