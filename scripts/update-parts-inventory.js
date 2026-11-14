const db = require('../lib/db');

// Master specification of all 34 parts
const partsInput = [
  // 1
  {
    raw: '278272110033',
    formatted: '278-27211-00-33',
    name: 'Pedal, Brake',
    description: 'Yamaha OEM Brake Pedal',
    targetCount: 2,
    categoryId: 16, // Body & Frame
    price: 25.73,
    warehouseId: 2
  },
  // 2
  {
    raw: '4V88337130',
    formatted: '4V8-83371-30',
    name: 'Horn',
    description: 'Yamaha OEM 12V Horn Assembly',
    targetCount: 2,
    categoryId: 2, // Electrical
    price: 32.00,
    warehouseId: 2
  },
  // 3
  {
    raw: '306258100A',
    formatted: '306-25810-0A',
    name: 'Caliper Assembly',
    description: 'Yamaha OEM Disc Brake Caliper Assembly',
    targetCount: 7,
    categoryId: 5, // Brakes
    price: 145.00,
    warehouseId: 2
  },
  // 4: 361111101 (distinct barcode 361111101 on ID 1557)
  {
    raw: '361111101',
    formatted: '361111101',
    barcode: '361111101',
    name: 'Cylinder Head',
    description: 'Yamaha OEM RD250 Cylinder Head',
    targetCount: 2,
    categoryId: 1, // Engine Parts
    price: 120.00,
    warehouseId: 2,
    matchId: 1557
  },
  // 5
  {
    raw: '9017908026',
    formatted: '90179-08026',
    name: 'Nut, Specl Shape',
    description: 'Yamaha OEM Special Cylinder Head Nut',
    targetCount: 5,
    categoryId: 18, // Fasteners & Hardware
    price: 4.50,
    warehouseId: 2
  },
  // 6
  {
    raw: '1561561801',
    formatted: '156-15618-01-00',
    name: 'Cover, Kick Lever',
    description: 'Yamaha OEM Kick Lever Rubber Cover',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 9.99,
    warehouseId: 2
  },
  // 7
  {
    raw: '2F3156110093',
    formatted: '2F3-15611-00-93',
    name: 'Crank, Kick',
    description: 'Yamaha OEM Kick Starter Crank Assembly',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 92.81,
    warehouseId: 2
  },
  // 8
  {
    raw: '5831562100',
    formatted: '583-15621-00-00',
    name: 'Boss, Kick Crank',
    description: 'Yamaha OEM Kick Crank Boss Joint',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 38.50,
    warehouseId: 2
  },
  // 9
  {
    raw: '4R52515100',
    formatted: '4R5-25151-00',
    name: 'Camshaft',
    description: 'Yamaha OEM Front Brake Camshaft / Actuator Cam',
    targetCount: 1,
    categoryId: 5, // Brakes
    price: 24.50,
    warehouseId: 2
  },
  // 10
  {
    raw: '1682515500',
    formatted: '168-25155-00',
    name: 'Lever, Camshaft 1',
    description: 'Yamaha OEM Front Brake Camshaft Lever',
    targetCount: 1,
    categoryId: 5, // Brakes
    price: 18.00,
    warehouseId: 2
  },
  // 11
  {
    raw: '2782518100',
    formatted: '278-25181-00',
    name: 'Axle, Wheel',
    description: 'Yamaha OEM Front Wheel Axle Shaft',
    targetCount: 1,
    categoryId: 17, // Wheels & Tires
    price: 35.00,
    warehouseId: 2
  },
  // 12
  {
    raw: '246251110038',
    formatted: '246-25111-00-38',
    name: 'Hub, Front',
    description: 'Yamaha OEM Front Wheel Hub Assembly',
    targetCount: 1,
    categoryId: 17, // Wheels & Tires
    price: 125.00,
    warehouseId: 2
  },
  // 13
  {
    raw: '3612512010',
    formatted: '361-25120-10',
    name: 'Brake Shoe Plate Assembly',
    description: 'Yamaha OEM Rear Brake Shoe Anchor Plate Assembly',
    targetCount: 1,
    categoryId: 5, // Brakes
    price: 65.00,
    warehouseId: 2
  },
  // 14
  {
    raw: '2781441101',
    formatted: '278-14411-01',
    name: 'Case, Air Cleaner',
    description: 'Yamaha OEM Air Cleaner Filter Box Housing Case',
    targetCount: 3,
    categoryId: 7, // Fuel System
    price: 45.00,
    warehouseId: 2
  },
  // 15
  {
    raw: '2781445900',
    formatted: '278-14459-00',
    name: 'HOLDER',
    description: 'Yamaha OEM Air Filter Element Holder',
    targetCount: 1,
    categoryId: 7, // Fuel System
    price: 12.99,
    warehouseId: 2
  },
  // 16
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
  // 17
  {
    raw: '3611131100',
    formatted: '361-11311-00',
    name: 'CYLINDER, left',
    description: 'Yamaha OEM RD250 Left Cylinder Barrel',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 89.99,
    warehouseId: 2
  },
  // 18
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
  // 19
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
  // 20
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
  // 21
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
  // 22
  {
    raw: '3418291100',
    formatted: '341-82911-00',
    name: 'Holder, Lever 1',
    description: 'Yamaha OEM Handlebar Lever Holder',
    targetCount: 1,
    categoryId: 52, // Handlebar Cable
    price: 22.50,
    warehouseId: 2
  },
  // 23
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
  // 24
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
  // 25
  {
    raw: '3608259043',
    formatted: '360-82590-43-00',
    name: 'Wire Harness Assembly',
    description: 'Yamaha OEM Main Wiring Harness Loom Assembly',
    targetCount: 1,
    categoryId: 2, // Electrical
    price: 89.00,
    warehouseId: 2
  },
  // 26
  {
    raw: '2788197021',
    formatted: '278-81970-21-00',
    name: 'Rectifier Assembly',
    description: 'Yamaha OEM Silicon Rectifier Assembly',
    targetCount: 1,
    categoryId: 2, // Electrical
    price: 45.00,
    warehouseId: 2
  },
  // 27
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
  // 28
  {
    raw: '3512583101',
    formatted: '351-25831-01',
    name: 'Disc, Brake',
    description: 'Yamaha OEM Front Brake Disc Rotor',
    targetCount: 1,
    categoryId: 5, // Brakes
    price: 30.00,
    warehouseId: 2
  },
  // 29
  {
    raw: '3502544020',
    formatted: '350-25440-20',
    name: 'Sprocket, Driven (40T)',
    description: 'Yamaha OEM Rear Driven Chain Sprocket 40T',
    targetCount: 1,
    categoryId: 17, // Wheels & Tires
    price: 45.00,
    warehouseId: 2
  },
  // 30: 3611111101 (maps to ID 49: 361-11111-01)
  {
    raw: '3611111101',
    formatted: '361-11111-01',
    barcode: '361-11111-01',
    name: 'HEAD, cylinder',
    description: 'Yamaha OEM Cylinder Head RD250',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 207.99,
    warehouseId: 2,
    matchId: 49
  },
  // 31
  {
    raw: '2781542100',
    formatted: '278-15421-00',
    name: 'Cover, Crankcase 2',
    description: 'Yamaha OEM Right Crankcase / Clutch Cover',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 85.00,
    warehouseId: 2
  },
  // 32
  {
    raw: '2781317501',
    formatted: '278-13175-01',
    name: 'Shaft, Worm',
    description: 'Yamaha OEM Oil Pump Worm Drive Shaft',
    targetCount: 1,
    categoryId: 1, // Engine Parts
    price: 35.00,
    warehouseId: 2
  },
  // 33
  {
    raw: '2781441201',
    formatted: '278-14412-01',
    name: 'Cap, Cleaner Case 1',
    description: 'Yamaha OEM Air Cleaner Case Cap / Lid',
    targetCount: 2,
    categoryId: 7, // Fuel System
    price: 35.00,
    warehouseId: 2
  },
  // 34
  {
    raw: '2781445100',
    formatted: '278-14451-00',
    name: 'Element, Air Cleaner',
    description: 'Yamaha OEM Air Cleaner Filter Element',
    targetCount: 2,
    categoryId: 7, // Fuel System
    price: 19.99,
    warehouseId: 2
  }
];

const clean = s => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

async function run() {
  const client = await db.pool.connect();

  try {
    console.log('🔄 Starting transaction to process 34 parts...');
    await client.query('BEGIN');

    // Retrieve all products
    const allProdsRes = await client.query('SELECT id, name, description, part_number, barcode, quantity, price, category_id, warehouse_id, ref_no FROM products');
    const existingProducts = allProdsRes.rows;

    const auditLog = [];

    // Step 0: Ensure ID 1557 barcode is set to '361111101' if matching 361111101 so that ID 49 can have '361-11111-01' in warehouse 2
    await client.query(
      `UPDATE products SET barcode = '361111101', part_number = '361111101', ref_no = '361111101' WHERE id = 1557`
    );

    for (let i = 0; i < partsInput.length; i++) {
      const item = partsInput[i];
      const c = clean(item.raw);

      // Find match
      let matched = [];
      if (item.matchId) {
        matched = existingProducts.filter(p => Number(p.id) === item.matchId);
      } else {
        matched = existingProducts.filter(p => {
          const cr = clean(p.part_number);
          const cb = clean(p.barcode);
          const cref = clean(p.ref_no);
          if (!cr && !cb && !cref) return false;
          return cr === c || cb === c || cref === c ||
                 cr === c + '00' || cb === c + '00' ||
                 (c.endsWith('00') && (cr === c.slice(0, -2) || cb === c.slice(0, -2)));
        });
      }

      if (matched.length > 0) {
        // Designate primary row (prefer warehouse_id = 2 or matching item.matchRef or higher ID)
        let primary = matched[0];
        if (matched.length > 1) {
          primary = matched.find(p => p.warehouse_id == item.warehouseId) ||
                    matched.find(p => clean(p.ref_no) === c) ||
                    matched[matched.length - 1];
        }
        const secondaries = matched.filter(p => p.id !== primary.id);

        const initialQty = primary.quantity;

        // Step 1: Set initial count to 0 in DB
        await client.query(
          'UPDATE products SET quantity = 0, updated_at = NOW() WHERE id = $1',
          [primary.id]
        );

        // Also ensure secondaries are set to 0
        for (const sec of secondaries) {
          await client.query(
            'UPDATE products SET quantity = 0, updated_at = NOW() WHERE id = $1',
            [sec.id]
          );
        }

        // Step 2: Set count from given info
        await client.query(`
          UPDATE products 
          SET quantity = $1,
              warehouse_id = COALESCE(warehouse_id, $2),
              updated_at = NOW()
          WHERE id = $3
        `, [item.targetCount, item.warehouseId, primary.id]);

        auditLog.push({
          index: i + 1,
          partNumber: item.raw,
          formatted: primary.part_number,
          productId: primary.id,
          name: primary.name,
          status: 'EXISTED - RESET TO 0 THEN UPDATED',
          initialQty: initialQty,
          finalQty: item.targetCount,
          warehouseId: primary.warehouse_id || item.warehouseId
        });
      } else {
        // Part does not exist in DB: add to DB
        // Step 1: Insert into DB with count 0
        const insertRes = await client.query(`
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
          ) VALUES ($1, $2, $3, $4, 'New', $5, 0, $6, $7, NOW(), NOW(), '[]'::jsonb)
          RETURNING id, name, part_number, barcode, quantity, price, warehouse_id
        `, [
          item.name,
          item.description,
          item.formatted,
          item.barcode || item.formatted,
          item.price,
          item.categoryId,
          item.warehouseId
        ]);

        const newProd = insertRes.rows[0];

        // Step 2: Set count from given info
        await client.query(`
          UPDATE products 
          SET quantity = $1, 
              updated_at = NOW() 
          WHERE id = $2
        `, [item.targetCount, newProd.id]);

        auditLog.push({
          index: i + 1,
          partNumber: item.raw,
          formatted: newProd.part_number,
          productId: newProd.id,
          name: newProd.name,
          status: 'ADDED NEW TO DB (INIT 0 THEN UPDATED)',
          initialQty: 0,
          finalQty: item.targetCount,
          warehouseId: newProd.warehouse_id
        });
      }
    }

    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!');
    console.log(`\nProcessed ${auditLog.length} total parts:\n`);
    console.table(auditLog.map(a => ({
      '#': a.index,
      'Raw Input': a.partNumber,
      'Part Number': a.formatted,
      'ID': a.productId,
      'Product Name': a.name,
      'Status': a.status,
      'Init Qty': a.initialQty,
      'Final Qty': a.finalQty,
      'WH': a.warehouseId
    })));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back due to error:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

run();
