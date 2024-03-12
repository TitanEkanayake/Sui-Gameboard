import "dotenv/config";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/sui.js/utils";
import { SuiClient, SuiObjectChange } from "@mysten/sui.js/client";

import path, { dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { writeFileSync } from "fs";

const priv_key = process.env.PRIVATE_KEY;
if (!priv_key) {
  console.log("Error: PRIVATE_KEY not set in .env");
  process.exit(1);
}

const path_to_scripts = dirname(fileURLToPath(import.meta.url));

const keypair = Ed25519Keypair.fromSecretKey(fromB64(priv_key).slice(1));

const path_to_contracts = path.join(path_to_scripts, "../../contracts");

const client = new SuiClient({ url: "https://fullnode.devnet.sui.io:443" });

console.log("Building Contracts...");
const { modules, dependencies } = JSON.parse(
  execSync(
    `sui move build --dump-bytecode-as-base64 --path ${path_to_contracts}`,
    { encoding: "utf-8" }
  )
);
console.log("Deploying Contracts...");

console.log(`Deploying from ${keypair.toSuiAddress()}`);

const deploy_trx = new TransactionBlock();
const [upgrade_cap] = deploy_trx.publish({
  modules,
  dependencies,
});

deploy_trx.transferObjects(
  [upgrade_cap],
  deploy_trx.pure(keypair.toSuiAddress())
);

const { objectChanges, balanceChanges } =
  await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: deploy_trx,
    options: {
      showBalanceChanges: true,
      showEffects: true,
      showEvents: true,
      showInput: false,
      showObjectChanges: true,
      showRawInput: false,
    },
  });

// console.log(objectChanges, balanceChanges);

if (!balanceChanges) {
  console.log(`Error: No Balance Changes was Undefined`);
  process.exit(1);
}

if (!objectChanges) {
  console.log(`Error: No Object Changes was Undefined`);
  process.exit(1);
}

function parse_amount(amount: string): number {
  return parseInt(amount) / 1_000_000_000;
}

console.log(
  `Spent ${Math.abs(parse_amount(balanceChanges[0].amount))} on deploy`
);

// balanceChanges[0].amount;

const published_change = objectChanges.find(
  (change) => change.type == "published"
);

if (published_change?.type !== "published") {
  console.log(`Error: Did not find correct published change`);
  process.exit(1);
}

function find_one_by_type(changes: SuiObjectChange[], type: string) {
  const object_change = changes.find(
    (change) => change.type == "created" && change.objectType == type
  );
  if (object_change?.type == "created") {
    return object_change.objectId;
  }
}

const package_id = published_change.packageId;
const deployed_address: any = {
  PACKAGE_ID: published_change.packageId,
};

const place_type = `${deployed_address.PACKAGE_ID}::my_module::Place`;
const place_id = find_one_by_type(objectChanges, place_type);
if (!place_id) {
  console.log("Error: Could not find the Place Object");
  process.exit(1);
}

deployed_address.PLACE_ID = place_id;

const quadrant_trx = new TransactionBlock();
quadrant_trx.moveCall({
  target: `${package_id}::my_module::get_quadrants`,
  arguments: [quadrant_trx.object(place_id)],
});

console.log("getting addresses of Quadrants...");
console.log("Quadrant trax looks like -: ", quadrant_trx.object(place_id));
const read_result = await client.devInspectTransactionBlock({
  sender: keypair.toSuiAddress(),
  transactionBlock: quadrant_trx,
});

console.log("Read results are -:", read_result);

const return_values = read_result?.results?.[0].returnValues;
console.log("return values are ", return_values);
if (!return_values) {
  console.log(`Error: Return Values not found`);
  process.exit(1);
}

const deployed_path = path.join(
  path_to_scripts,
  "../src/deployed_objects.json"
);

writeFileSync(deployed_path, JSON.stringify(deployed_address, null, 4));
