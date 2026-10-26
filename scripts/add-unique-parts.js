const db = require('../lib/db');

// Master specification of all 37 unique part numbers and their aggregated counts
const partsToProcess = [
  {
    raw: '1A02179200',
    formatted: '1A0-21792-00',
    name: 'Gauge, Oil',
    description: 'Yamaha OEM Oil Tank Level Gauge',
    targetCount: 1,
    categoryId: 7, // Fuel System / Oil
    price: 18.50,
    warehouseId: 2
  },
  {
    raw: '2142177100',
    formatted: '214-21771-00',
    name: 'Body, Cap',
    description: 'Yamaha OEM Oil Tank Cap Body',
    targetCount: 2,
    categoryId: 7, // Fuel System / Oil
    price: 15.00,
    warehouseId: 2
  },
  {
    raw: '278233403133',
    formatted: '278-23340-31-33',
    name: 'Under Bracket',
    description: 'Yamaha OEM Steering Stem Under Bracket / Lower Triple Clamp',
    targetCount: 1,
    categoryId: 49, // Steering
    price: 65.00,
    warehouseId: 2
  },
  {
    raw: '2782341900',
    formatted: '278-23419-00',
    name: 'Shaft, Damper',
    description: 'Yamaha OEM Steering Damper Shaft',
    targetCount: 1,
    categoryId: 49, // Steering
    price: 55.00,
    warehouseId: 2
  },
  {
    raw: '2782343500',
    formatted: '278-23435-00',
    name: 'Crown, Handle',
    description: 'Yamaha OEM Steering Handle Crown / Top Triple Tree Bridge',
    targetCount: 1,
    categoryId: 49, // Steering
    price: 55.00,
    warehouseId: 2
  },
  {
    raw: '278272110033',
    formatted: '278-27211-00-33',
    name: 'Pedal, Brake',
    description: 'Yamaha OEM Brake Pedal',
    targetCount: 2, // 1 + 1 from user batches
    categoryId: 16, // Body & Frame
    price: 25.73,
    warehouseId: 2
  },
  {
    raw: '306258100A',
    formatted: '306-25810-0A',
    name: 'Caliper Assembly',
    description: 'Yamaha OEM Disc Brake Caliper Assembly',
    targetCount: 4, // 1 + 3 from user batches
    categoryId: 5, // Brakes
    price: 145.00,
    warehouseId: 2
  },
  {
    raw: '3418291100',
    formatted: '341-82911-00',
    name: 'Holder, Lever 1',
    description: 'Yamaha OEM Handlebar Lever Holder',
    targetCount: 2, // 1 + 1 from user batches
    categoryId: 52, // Handlebar Cable
    price: 22.50,
    warehouseId: 2
  },
  {
    raw: '3512583101',
    formatted: '351-25831-01',
    name: 'Disc, Brake',
    description: 'Yamaha OEM Front Brake Disc Rotor',
    targetCount: 4,
    categoryId: 5, // Brakes
    price: 30.00,
    warehouseId: 2
  },
  {
    raw: '3512583200',
    formatted: '351-25832-00',
    name: 'Caliper Bracket',
    description: 'Yamaha OEM Disc Brake Caliper Mounting Bracket',
    targetCount: 2,
    categoryId: 5, // Brakes
    price: 45.00,
    warehouseId: 2
  },
  {
    raw: '360217030048',
    formatted: '360-21703-00-48',
    name: 'Side Cover 1',
    description: 'Yamaha OEM Left Side Cover (Code 48)',
    targetCount: 2,
    categoryId: 16, // Body & Frame
    price: 59.00,
    warehouseId: 2
  },
  {
    raw: '360217050048',
    formatted: '360-21705-00-48',
    name: 'Oil Tank Assembly',
    description: 'Yamaha OEM 2-Stroke Oil Tank Assembly (Code 48)',
    targetCount: 1,
    categoryId: 7, // Fuel System / Oil
    price: 69.41,
    warehouseId: 2
  },
  {
    raw: '3602175300',
    formatted: '360-21753-00',
    name: 'Boss, Connector',
    description: 'Yamaha OEM Oil Tank Boss Connector',
    targetCount: 1,
    categoryId: 7, // Fuel System / Oil
    price: 12.00,
    warehouseId: 2
  },
  {
    raw: '3602184300',
    formatted: '360-21843-00',
    name: 'Stay',
    description: 'Yamaha OEM Frame / Side Cover Mounting Stay',
    targetCount: 1,
    categoryId: 16, // Body & Frame
    price: 18.00,
    warehouseId: 2
  },
  {
    raw: '361111101',
    formatted: '361-11111-01',
    name: 'Cylinder Head',
    description: 'Yamaha OEM RD250 Cylinder Head',
    targetCount: 2, // 1 + 1 from user batches
    categoryId: 1, // Engine Parts
    price: 120.00,
    warehouseId: 2
  },
  {
    raw: '401234410098',
    formatted: '401-23441-00-98',
    name: 'Holder, Handle Upr',
    description: 'Yamaha OEM Upper Handlebar Clamp Holder',
    targetCount: 1,
    categoryId: 49, // Steering
    price: 41.33,
    warehouseId: 2
  },
  {
    raw: '2781317400',
    formatted: '278-13174-00',
    name: 'Holder, Oil Pipe',
    description: 'Yamaha OEM 2-Stroke Oil Injection Pipe Holder',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 14.50,
    warehouseId: 2
  },
  {
    raw: '2781534000',
    formatted: '278-15340-00',
    name: 'Plug, Crankcase',
    description: 'Yamaha OEM Crankcase / Oil Pump Access Plug',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 15.00,
    warehouseId: 2
  },
  {
    raw: '2781541100',
    formatted: '278-15411-00',
    name: 'Cover, Crankcase 1',
    description: 'Yamaha OEM Left Engine Crankcase / Generator Cover',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 85.00,
    warehouseId: 2
  },
  {
    raw: '2781541700',
    formatted: '278-15417-00',
    name: 'Cover, Cap',
    description: 'Yamaha OEM Clutch Adjuster Cap Cover',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 9.50,
    warehouseId: 2
  },
  {
    raw: '2788191022',
    formatted: '278-81910-22',
    name: 'Voltage Reg Assembly',
    description: 'Yamaha OEM Voltage Regulator Assembly',
    targetCount: 1,
    categoryId: 2, // Electrical
    price: 65.00,
    warehouseId: 2
  },
  {
    raw: '2788356001',
    formatted: '278-83560-01',
    name: 'Tachometer Cable Assembly',
    description: 'Yamaha OEM Tachometer Drive Cable Assembly',
    targetCount: 1,
    categoryId: 2, // Electrical
    price: 24.00,
    warehouseId: 2
  },
  {
    raw: '3601310101',
    formatted: '360-13101-01',
    name: 'Oil Pump Assembly',
    description: 'Yamaha OEM Autolube 2-Stroke Oil Pump Assembly',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 149.00,
    warehouseId: 2
  },
  {
    raw: '3601541601',
    formatted: '360-15416-01',
    name: 'Cover, Oil Pump',
    description: 'Yamaha OEM Right Crankcase Oil Pump Cover',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 35.00,
    warehouseId: 2
  },
  {
    raw: '3601542101',
    formatted: '360-15421-01',
    name: 'Cover, Crankcase 2',
    description: 'Yamaha OEM Right Crankcase / Clutch Cover',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 85.00,
    warehouseId: 2
  },
  {
    raw: '3602164500',
    formatted: '360-21645-00',
    name: 'Stay, Rear',
    description: 'Yamaha OEM Frame Rear Fender Stay',
    targetCount: 2,
    categoryId: 3, // Bodywork
    price: 74.99,
    warehouseId: 2
  },
  {
    raw: '360223110093',
    formatted: '360-22311-00-93',
    name: 'Chain Case',
    description: 'Yamaha OEM Drive Chain Guard Case',
    targetCount: 1,
    categoryId: 16, // Body & Frame
    price: 45.00,
    warehouseId: 2
  },
  {
    raw: '360234350198',
    formatted: '360-23435-01-98',
    name: 'Crown, Handle',
    description: 'Yamaha OEM Steering Handle Crown',
    targetCount: 1,
    categoryId: 49, // Steering
    price: 70.97,
    warehouseId: 2
  },
  {
    raw: '3611131100',
    formatted: '361-11311-00',
    name: 'CYLINDER, left',
    description: 'Yamaha OEM RD250 Left Cylinder Barrel',
    targetCount: 2, // 1 + 1 from user batches
    categoryId: 1, // Engine Parts
    price: 89.99,
    warehouseId: 2
  },
  {
    raw: '9017908026',
    formatted: '90179-08026',
    name: 'Nut, Specl Shape',
    description: 'Yamaha OEM Special Cylinder Head Nut',
    targetCount: 4,
    categoryId: 18, // Fasteners & Hardware
    price: 4.50,
    warehouseId: 2
  },
  {
    raw: '1562741300',
    formatted: '156-27413-00',
    name: 'Cover, Footrest',
    description: 'Yamaha OEM Rubber Footrest Cover',
    targetCount: 2,
    categoryId: 16, // Body & Frame
    price: 8.50,
    warehouseId: 2
  },
  {
    raw: '1682537100',
    formatted: '168-25371-00',
    name: 'Tension Bar',
    description: 'Yamaha OEM Rear Brake Reaction Tension Bar',
    targetCount: 1,
    categoryId: 5, // Brakes
    price: 28.00,
    warehouseId: 2
  },
  {
    raw: '2782741200',
    formatted: '278-27412-00',
    name: 'Bracket, Footrest 1',
    description: 'Yamaha OEM Footrest Mounting Bracket',
    targetCount: 1,
    categoryId: 16, // Body & Frame
    price: 25.00,
    warehouseId: 2
  },
  {
    raw: '2782745100',
    formatted: '278-27451-00',
    name: 'Footrest',
    description: 'Yamaha OEM Rider Footrest Assembly',
    targetCount: 2,
    categoryId: 16, // Body & Frame
    price: 35.00,
    warehouseId: 2
  },
  {
    raw: '2801118101',
    formatted: '280-11181-01',
    name: 'GASKET, cylinder head',
    description: 'Yamaha OEM Cylinder Head Gasket',
    targetCount: 2,
    categoryId: 1, // Engine Parts
    price: 283.99,
    warehouseId: 2
  },
  {
    raw: '3611132100',
    formatted: '361-11321-00',
    name: 'CYLINDER, right',
    description: 'Yamaha OEM RD250 Right Cylinder Barrel',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 89.99,
    warehouseId: 2
  },
  {
    raw: '4V88337130',
    formatted: '4V8-83371-30',
    name: 'Horn',
    description: 'Yamaha OEM 12V Horn Assembly',
    targetCount: 1,
    categoryId: 2, // Electrical
    price: 32.00,
    warehouseId: 2
  }
];

const clean = s => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

async function run() {
  const client = await db.getClient ? await db.getClient() : null;
  // If no getClient, use query directly with transaction commands
  const query = client ? client.query.bind(client) : db.query.bind(db);

  try {
    await query('BEGIN');
    console.log('--- Starting Transaction ---');

    // Fetch all current products
    const allProdsRes = await query('SELECT id, name, part_number, barcode, quantity, price, category_id, warehouse_id FROM products');
    const existingProducts = allProdsRes.rows;

    const results = [];

    for (const item of partsToProcess) {
      const cItem = clean(item.raw);

      // Find matching products in DB
      const matched = existingProducts.filter(p => clean(p.part_number) === cItem || clean(p.barcode) === cItem);

      if (matched.length > 0) {
        // Handle duplicate rows if any (e.g. 2782341900 having id 1537 and 1546)
        if (matched.length === 1) {
          const prod = matched[0];
          // Check if placeholder name needs updating
          const isPlaceholder = ['Fx', 'Fx2', 'Part x', 'X02', 'Fuel-2', 'STAY,', '2'].includes(prod.name.trim());
          const newName = isPlaceholder ? item.name : prod.name;
          const newCat = isPlaceholder ? item.categoryId : (prod.category_id || item.categoryId);
          const newPrice = (isPlaceholder && Number(prod.price) <= 1.0) ? item.price : prod.price;

          await query(`
            UPDATE products 
            SET quantity = $1, 
                name = $2, 
                category_id = $3, 
                price = $4,
                warehouse_id = COALESCE(warehouse_id, $5),
                updated_at = NOW()
            WHERE id = $6
          `, [item.targetCount, newName, newCat, newPrice, item.warehouseId, prod.id]);

          results.push({
            status: 'UPDATED',
            id: prod.id,
            input: item.raw,
            part_number: prod.part_number,
            name: newName,
            oldQty: prod.quantity,
            newQty: item.targetCount
          });
        } else {
          // Multiple rows exist
          // Designate primary (prefer row with warehouse_id = 2 or latest ID)
          const primary = matched.find(p => p.warehouse_id == item.warehouseId) || matched[matched.length - 1];
          const secondaries = matched.filter(p => p.id !== primary.id);

          const isPlaceholder = ['Fx', 'Fx2', 'Part x', 'X02', 'Fuel-2', 'STAY,', '2'].includes(primary.name.trim());
          const newName = isPlaceholder ? item.name : primary.name;
          const newCat = isPlaceholder ? item.categoryId : (primary.category_id || item.categoryId);
          const newPrice = (isPlaceholder && Number(primary.price) <= 1.0) ? item.price : primary.price;

          await query(`
            UPDATE products 
            SET quantity = $1, 
                name = $2, 
                category_id = $3, 
                price = $4,
                warehouse_id = COALESCE(warehouse_id, $5),
                updated_at = NOW()
            WHERE id = $6
          `, [item.targetCount, newName, newCat, newPrice, item.warehouseId, primary.id]);

          for (const sec of secondaries) {
            await query(`UPDATE products SET quantity = 0, updated_at = NOW() WHERE id = $1`, [sec.id]);
          }

          results.push({
            status: 'UPDATED (multi-row resolved)',
            id: primary.id,
            input: item.raw,
            part_number: primary.part_number,
            name: newName,
            oldQty: primary.quantity,
            newQty: item.targetCount
          });
        }
      } else {
        // Insert new product
        const insertRes = await query(`
          INSERT INTO products (
            name, 
            description, 
            part_number, 
            barcode, 
            condition_status, 
            price, 
            quantity, 
            category_id, 
            warehouse_id, 
            created_at, 
            updated_at, 
            images
          ) VALUES ($1, $2, $3, $4, 'New', $5, $6, $7, $8, NOW(), NOW(), '[]'::jsonb)
          RETURNING id, name, part_number, barcode, quantity, price
        `, [
          item.name,
          item.description,
          item.formatted,
          item.formatted,
          item.price,
          item.targetCount,
          item.categoryId,
          item.warehouseId
        ]);

        const newProd = insertRes.rows[0];
        results.push({
          status: 'INSERTED',
          id: newProd.id,
          input: item.raw,
          part_number: newProd.part_number,
          name: newProd.name,
          oldQty: 0,
          newQty: newProd.quantity
        });
      }
    }

    await query('COMMIT');
    console.log('--- Transaction Committed Successfully ---');
    console.log(`\nProcessed ${results.length} total unique part specifications.`);
    console.table(results);

    process.exit(0);
  } catch (err) {
    await query('ROLLBACK');
    console.error('--- Transaction Rolled Back Due To Error ---', err);
    process.exit(1);
  } finally {
    if (client && client.release) client.release();
  }
}

run();
