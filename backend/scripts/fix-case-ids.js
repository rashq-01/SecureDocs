/**
 * Diagnose (and optionally repair) case documents whose _id was stored as a
 * STRING instead of an ObjectId.
 *
 * Symptom this explains:
 *   - The case shows up in the /cases list (Case.find returns it)
 *   - Clicking it 404s, because Case.findById(id) casts `id` -> ObjectId and an
 *     ObjectId can never equal a String in MongoDB, so the lookup misses.
 *
 * Usage (run from the backend/ directory):
 *   node scripts/fix-case-ids.js                      # read-only report
 *   node scripts/fix-case-ids.js 6a8ad3ee...          # + focused check on one id
 *   node scripts/fix-case-ids.js --fix                # normalize String _ids -> ObjectId
 *   node scripts/fix-case-ids.js --fix 6a8ad3ee...    # both
 */
const mongoose = require('mongoose');
const config = require('../src/config/env');

const args = process.argv.slice(2);
const doFix = args.includes('--fix');
const targetId = args.find((a) => /^[0-9a-fA-F]{24}$/.test(a)) || null;

const bsonType = (v) =>
  v === null || v === undefined
    ? String(v)
    : v._bsontype || v.constructor?.name || typeof v;

(async () => {
  await mongoose.connect(config.mongoUri);
  const coll = mongoose.connection.db.collection('cases');
  console.log(`Connected to ${mongoose.connection.host} / db "${mongoose.connection.name}"\n`);

  const raw = await coll.find({}).toArray();
  console.log(`'cases' collection holds ${raw.length} document(s):\n`);

  const stringIdDocs = [];
  for (const d of raw) {
    const t = bsonType(d._id);
    const flag = t === 'ObjectId' ? 'ok' : `<-- _id is a ${t}, NOT ObjectId`;
    console.log(`  ${String(d._id)}  caseId=${d.caseId || '?'}  [${t}] ${t === 'ObjectId' ? '' : flag}`);
    if (t !== 'ObjectId') stringIdDocs.push(d);
  }

  console.log(
    `\n${stringIdDocs.length} document(s) have a non-ObjectId _id — these are the ones that 404 when opened.`
  );

  if (targetId) {
    console.log(`\n--- focused check on ${targetId} ---`);
    const asString = await coll.findOne({ _id: targetId });
    const asObjectId = await coll.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
    console.log(`  matches a STRING _id:   ${asString ? 'YES (this is the bug)' : 'no'}`);
    console.log(`  matches an ObjectId _id: ${asObjectId ? 'YES (findById would work)' : 'no'}`);
  }

  if (!doFix) {
    if (stringIdDocs.length > 0) {
      console.log(`\nRe-run with --fix to convert them to real ObjectIds (same hex is preserved):`);
      console.log(`  node scripts/fix-case-ids.js --fix\n`);
    } else {
      console.log(`\nNo String _ids found. The 404 has a different cause — tell me and paste this output.\n`);
    }
    await mongoose.connection.close();
    process.exit(0);
  }

  // ---- repair ----
  let fixed = 0;
  for (const d of stringIdDocs) {
    const hex = String(d._id);
    if (!/^[0-9a-fA-F]{24}$/.test(hex)) {
      console.log(`  SKIP ${hex} (caseId=${d.caseId}): not a 24-char hex, can't map to the same ObjectId`);
      continue;
    }
    const oid = new mongoose.Types.ObjectId(hex);
    try {
      // Insert a copy with a proper ObjectId _id (reusing the same hex), then drop the String one.
      await coll.insertOne({ ...d, _id: oid });
      await coll.deleteOne({ _id: hex }); // exact String match, no casting
      fixed++;
      console.log(`  FIXED ${hex} (caseId=${d.caseId})`);
    } catch (err) {
      console.log(`  ERROR ${hex} (caseId=${d.caseId}): ${err.message}`);
    }
  }
  console.log(`\nDone. Normalized ${fixed}/${stringIdDocs.length} document(s). Reload the app — clicking a case now works.\n`);

  await mongoose.connection.close();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
