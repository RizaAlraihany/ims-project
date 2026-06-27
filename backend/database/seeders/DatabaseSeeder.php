<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\InventoryStock;
use App\Models\Product;
use App\Models\Role;
use App\Models\Setting;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StockOpname;
use App\Models\StockOpnameItem;
use App\Models\Transfer;
use App\Models\TransferItem;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $this->call(RolePermissionSeeder::class);

            $superAdminRole = Role::where('name', 'Super Admin')->first();
            $adminRole = Role::where('name', 'Admin Gudang')->first();
            $operatorRole = Role::where('name', 'Operator')->first();

            $admin = User::updateOrCreate(
                ['email' => 'admin@ims.test'],
                [
                    'name' => 'Admin IMS',
                    'password' => Hash::make('password'),
                    'role' => 'Admin',
                    'role_id' => $superAdminRole?->id,
                    'is_active' => true,
                ],
            );

            User::updateOrCreate(
                ['email' => 'manager@ims.test'],
                [
                    'name' => 'Manager Gudang',
                    'password' => Hash::make('password'),
                    'role' => 'Manager',
                    'role_id' => $adminRole?->id,
                    'is_active' => true,
                ],
            );

            User::updateOrCreate(
                ['email' => 'staff@ims.test'],
                [
                    'name' => 'Staff Gudang',
                    'password' => Hash::make('password'),
                    'role' => 'Staff',
                    'role_id' => $operatorRole?->id,
                    'is_active' => true,
                ],
            );

            $categories = $this->seedCategories();

            $units = collect([
                ['name' => 'Pieces', 'symbol' => 'PCS'],
                ['name' => 'Box', 'symbol' => 'BOX'],
                ['name' => 'Kilogram', 'symbol' => 'KG'],
                ['name' => 'Liter', 'symbol' => 'LTR'],
                ['name' => 'Pack', 'symbol' => 'PACK'],
                ['name' => 'Sak', 'symbol' => 'SAK'],
                ['name' => 'Dus', 'symbol' => 'DUS'],
                ['name' => 'Renceng', 'symbol' => 'RCG'],
                ['name' => 'Slop', 'symbol' => 'SLOP'],
            ])->map(fn (array $unit) => Unit::firstOrCreate(['symbol' => $unit['symbol']], $unit));

            $warehouses = collect([
                [
                    'code' => 'WH-001',
                    'name' => 'Gudang Utama Toko Sumber Rejeki',
                    'address' => 'Jl. Pasar Induk No. 12, Cirebon',
                    'manager_name' => 'Rudi Hartono',
                    'location' => 'Area Bongkar Muat',
                    'status' => true,
                ],
                [
                    'code' => 'WH-002',
                    'name' => 'Gudang Cabang Harjamukti',
                    'address' => 'Jl. Perjuangan No. 88, Harjamukti',
                    'manager_name' => 'Siti Aminah',
                    'location' => 'Rak Retail Harian',
                    'status' => true,
                ],
                [
                    'code' => 'WH-003',
                    'name' => 'Gudang Grosir Plered',
                    'address' => 'Komplek Pasar Plered Blok B-7',
                    'manager_name' => 'Agus Salim',
                    'location' => 'Area Grosir',
                    'status' => true,
                ],
                [
                    'code' => 'WH-004',
                    'name' => 'Gudang Cadangan Klayan',
                    'address' => 'Jl. Klayan Raya No. 45',
                    'manager_name' => 'Dewi Lestari',
                    'location' => 'Buffer Stock',
                    'status' => true,
                ],
                [
                    'code' => 'WH-005',
                    'name' => 'Gudang Transit Lemahwungkuk',
                    'address' => 'Jl. Kalibaru Selatan No. 9',
                    'manager_name' => 'Taufik Hidayat',
                    'location' => 'Transit Barang Masuk',
                    'status' => true,
                ],
            ])->map(fn (array $warehouse) => Warehouse::updateOrCreate(
                ['code' => $warehouse['code']],
                $warehouse,
            ));

            $products = $this->seedProducts($categories, $units);
            $productIds = $products->pluck('id');
            
            $this->seedSettings();

            StockMovement::query()
                ->whereIn('product_id', $productIds)
                ->where('reference_no', 'like', 'INIT-%')
                ->delete();

            StockBatch::query()
                ->whereIn('product_id', $productIds)
                ->where('batch_number', 'like', 'BATCH-%')
                ->delete();

            Inventory::query()
                ->whereIn('product_id', $productIds)
                ->delete();

            InventoryStock::query()
                ->whereIn('product_id', $productIds)
                ->delete();

            $products
                ->values()
                ->each(function (Product $product, int $productIndex) use ($admin, $warehouses): void {
                    $selectedWarehouses = $warehouses
                        ->values()
                        ->filter(fn (Warehouse $warehouse, int $warehouseIndex): bool => ($productIndex + $warehouseIndex) % 2 === 0)
                        ->take(3)
                        ->values();

                    $selectedWarehouses->each(function (Warehouse $warehouse, int $warehouseIndex) use ($admin, $product, $productIndex): void {
                        $minimumStock = (int) $product->minimum_stock;
                        $quantity = $minimumStock + 24 + ((($productIndex + 1) * ($warehouseIndex + 3)) % 80);

                        if (($productIndex + $warehouseIndex) % 13 === 0) {
                            $quantity = max(1, $minimumStock - 1);
                        }

                        Inventory::updateOrCreate(
                            [
                                'product_id' => $product->id,
                                'warehouse_id' => $warehouse->id,
                                'location_bin' => sprintf(
                                    'Rak %s-%02d',
                                    chr(65 + ($productIndex % 6)),
                                    $warehouseIndex + 1,
                                ),
                            ],
                            [
                                'quantity' => $quantity,
                            ],
                        );

                        InventoryStock::updateOrCreate(
                            [
                                'product_id' => $product->id,
                                'warehouse_id' => $warehouse->id,
                            ],
                            [
                                'quantity' => $quantity,
                            ],
                        );

                        $firstBatchQty = intdiv($quantity, 2);
                        $secondBatchQty = $quantity - $firstBatchQty;
                        $runningBalance = 0;

                        collect([$firstBatchQty, $secondBatchQty])
                            ->filter(fn (int $batchQty) => $batchQty > 0)
                            ->values()
                            ->each(function (int $batchQty, int $batchIndex) use ($admin, $product, $productIndex, $warehouse, $warehouseIndex, &$runningBalance): void {
                                $runningBalance += $batchQty;
                                $batchNumber = sprintf(
                                    'BATCH-SMB-%03d-%s-%02d',
                                    $productIndex + 1,
                                    $warehouse->code,
                                    $batchIndex + 1,
                                );
                                $receivedDate = now()
                                    ->subDays(($productIndex % 20) + $warehouseIndex + $batchIndex + 1)
                                    ->toDateString();
                                $unitCost = (float) $product->average_cost;
                                $referenceNo = sprintf(
                                    'INIT-SMB-%03d-%s-%02d',
                                    $productIndex + 1,
                                    $warehouse->code,
                                    $batchIndex + 1,
                                );

                                StockBatch::create([
                                    'product_id' => $product->id,
                                    'warehouse_id' => $warehouse->id,
                                    'batch_number' => $batchNumber,
                                    'qty_received' => $batchQty,
                                    'qty_remaining' => $batchQty,
                                    'initial_qty' => $batchQty,
                                    'remaining_qty' => $batchQty,
                                    'unit_cost' => $unitCost,
                                    'received_at' => $receivedDate,
                                    'received_date' => $receivedDate,
                                ]);

                                StockMovement::create([
                                    'reference_no' => $referenceNo,
                                    'movement_type' => 'STOCK_IN',
                                    'type' => 'IN',
                                    'product_id' => $product->id,
                                    'warehouse_id' => $warehouse->id,
                                    'source_warehouse_id' => null,
                                    'dest_warehouse_id' => $warehouse->id,
                                    'quantity' => $batchQty,
                                    'balance_after' => $runningBalance,
                                    'unit_cost' => $unitCost,
                                    'notes' => 'Stok awal demo gudang toko sembako.',
                                    'created_by' => $admin->id,
                                    'user_id' => $admin->id,
                                ]);
                            });
                    });
                });
                
            $this->seedTransfers($warehouses, $products, $admin);
            $this->seedStockOpnames($warehouses, $products, $admin);
            $this->seedContacts();
        });
    }

    private function seedContacts()
    {
        $contacts = [
            ['name' => 'PT Sumber Pangan Nusantara', 'type' => 'SUPPLIER', 'email' => 'contact@sumberpangan.co.id', 'phone' => '021-5551234', 'address' => 'Kawasan Industri Pulogadung', 'status' => true],
            ['name' => 'CV Bumi Makmur Jaya', 'type' => 'SUPPLIER', 'email' => 'sales@bumimakmur.com', 'phone' => '022-7778899', 'address' => 'Jl. Soekarno Hatta, Bandung', 'status' => true],
            ['name' => 'Toko Kelontong Berkah', 'type' => 'CUSTOMER', 'email' => 'toko.berkah@gmail.com', 'phone' => '081234567890', 'address' => 'Jl. Merdeka No 45, Jakarta', 'status' => true],
            ['name' => 'Warteg Sederhana', 'type' => 'CUSTOMER', 'email' => 'warteg.sederhana@yahoo.com', 'phone' => '085678901234', 'address' => 'Jl. Kebon Kacang Raya', 'status' => true],
            ['name' => 'UD Mandiri Sejahtera', 'type' => 'SUPPLIER', 'email' => 'ud.mandiri@sejahtera.net', 'phone' => '031-4445566', 'address' => 'Rungkut Industri, Surabaya', 'status' => true],
        ];

        foreach ($contacts as $contact) {
            \App\Models\Contact::updateOrCreate(['name' => $contact['name']], $contact);
        }
    }

    private function seedCategories()
    {
        $categoryRows = collect([
            ['name' => 'Beras & Bahan Pokok', 'description' => 'Beras, tepung, gula, garam, dan bahan pokok harian.'],
            ['name' => 'Minyak & Bumbu Dapur', 'description' => 'Minyak goreng, saus, kecap, rempah, dan bumbu instan.'],
            ['name' => 'Makanan Instan', 'description' => 'Mie instan, makanan kaleng, camilan, dan lauk praktis.'],
            ['name' => 'Minuman Kemasan', 'description' => 'Air mineral, teh, kopi, susu, dan minuman sachet.'],
            ['name' => 'Kebutuhan Rumah Tangga', 'description' => 'Sabun, deterjen, tisu, dan kebutuhan harian toko.'],
            ['name' => 'Grosir Warung', 'description' => 'Barang cepat jual untuk warung kecil dan pelanggan grosir.'],
        ]);

        $existingCategories = Category::query()
            ->orderBy('id')
            ->take($categoryRows->count())
            ->get()
            ->values();

        return $categoryRows->mapWithKeys(function (array $categoryData, int $index) use ($existingCategories) {
            $category = Category::where('name', $categoryData['name'])->first()
                ?? $existingCategories->get($index)
                ?? new Category();

            $category->fill($categoryData);
            $category->save();

            return [$categoryData['name'] => $category];
        });
    }

    private function seedProducts($categories, $units)
    {
        $productRows = collect([
            ['name' => 'Beras Pandan Wangi 5 Kg', 'category' => 'Beras & Bahan Pokok', 'unit' => 'SAK', 'minimum_stock' => 25, 'average_cost' => 73000, 'cost_method' => 'FIFO'],
            ['name' => 'Beras Ramos Premium 5 Kg', 'category' => 'Beras & Bahan Pokok', 'unit' => 'SAK', 'minimum_stock' => 30, 'average_cost' => 69500, 'cost_method' => 'FIFO'],
            ['name' => 'Beras Medium 10 Kg', 'category' => 'Beras & Bahan Pokok', 'unit' => 'SAK', 'minimum_stock' => 20, 'average_cost' => 128000, 'cost_method' => 'FIFO'],
            ['name' => 'Beras Ketan Putih 1 Kg', 'category' => 'Beras & Bahan Pokok', 'unit' => 'KG', 'minimum_stock' => 18, 'average_cost' => 17500, 'cost_method' => 'FIFO'],
            ['name' => 'Tepung Terigu Protein Sedang 1 Kg', 'category' => 'Beras & Bahan Pokok', 'unit' => 'KG', 'minimum_stock' => 35, 'average_cost' => 11600, 'cost_method' => 'AVERAGE'],
            ['name' => 'Tepung Tapioka 500 Gram', 'category' => 'Beras & Bahan Pokok', 'unit' => 'PACK', 'minimum_stock' => 24, 'average_cost' => 7200, 'cost_method' => 'AVERAGE'],
            ['name' => 'Gula Pasir Putih 1 Kg', 'category' => 'Beras & Bahan Pokok', 'unit' => 'KG', 'minimum_stock' => 40, 'average_cost' => 16200, 'cost_method' => 'FIFO'],
            ['name' => 'Gula Merah Aren 500 Gram', 'category' => 'Beras & Bahan Pokok', 'unit' => 'PACK', 'minimum_stock' => 22, 'average_cost' => 13500, 'cost_method' => 'FIFO'],
            ['name' => 'Garam Halus 250 Gram', 'category' => 'Beras & Bahan Pokok', 'unit' => 'PACK', 'minimum_stock' => 45, 'average_cost' => 3100, 'cost_method' => 'AVERAGE'],
            ['name' => 'Santan Instan 65 Ml', 'category' => 'Beras & Bahan Pokok', 'unit' => 'PCS', 'minimum_stock' => 60, 'average_cost' => 3200, 'cost_method' => 'AVERAGE'],
            ['name' => 'Minyak Goreng 1 Liter', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'LTR', 'minimum_stock' => 36, 'average_cost' => 16800, 'cost_method' => 'FIFO'],
            ['name' => 'Minyak Goreng 2 Liter', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'LTR', 'minimum_stock' => 28, 'average_cost' => 33500, 'cost_method' => 'FIFO'],
            ['name' => 'Minyak Goreng Jerigen 5 Liter', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'PCS', 'minimum_stock' => 14, 'average_cost' => 82000, 'cost_method' => 'FIFO'],
            ['name' => 'Kecap Manis 275 Ml', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'PCS', 'minimum_stock' => 42, 'average_cost' => 11800, 'cost_method' => 'AVERAGE'],
            ['name' => 'Saus Sambal 335 Ml', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'PCS', 'minimum_stock' => 34, 'average_cost' => 10400, 'cost_method' => 'AVERAGE'],
            ['name' => 'Saus Tomat 335 Ml', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'PCS', 'minimum_stock' => 28, 'average_cost' => 9800, 'cost_method' => 'AVERAGE'],
            ['name' => 'Bumbu Racik Ayam Goreng', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'RCG', 'minimum_stock' => 50, 'average_cost' => 2500, 'cost_method' => 'AVERAGE'],
            ['name' => 'Kaldu Bubuk Sachet', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'RCG', 'minimum_stock' => 55, 'average_cost' => 1900, 'cost_method' => 'AVERAGE'],
            ['name' => 'Merica Bubuk 35 Gram', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'PCS', 'minimum_stock' => 20, 'average_cost' => 7800, 'cost_method' => 'FIFO'],
            ['name' => 'Margarin Serbaguna 200 Gram', 'category' => 'Minyak & Bumbu Dapur', 'unit' => 'PCS', 'minimum_stock' => 26, 'average_cost' => 8600, 'cost_method' => 'FIFO'],
            ['name' => 'Mie Instan Goreng', 'category' => 'Makanan Instan', 'unit' => 'DUS', 'minimum_stock' => 18, 'average_cost' => 108000, 'cost_method' => 'AVERAGE'],
            ['name' => 'Mie Instan Ayam Bawang', 'category' => 'Makanan Instan', 'unit' => 'DUS', 'minimum_stock' => 18, 'average_cost' => 106000, 'cost_method' => 'AVERAGE'],
            ['name' => 'Mie Instan Soto', 'category' => 'Makanan Instan', 'unit' => 'DUS', 'minimum_stock' => 16, 'average_cost' => 106000, 'cost_method' => 'AVERAGE'],
            ['name' => 'Bihun Jagung 175 Gram', 'category' => 'Makanan Instan', 'unit' => 'PACK', 'minimum_stock' => 30, 'average_cost' => 6200, 'cost_method' => 'FIFO'],
            ['name' => 'Sarden Saus Tomat 155 Gram', 'category' => 'Makanan Instan', 'unit' => 'PCS', 'minimum_stock' => 24, 'average_cost' => 9400, 'cost_method' => 'FIFO'],
            ['name' => 'Kornet Sapi Kaleng 198 Gram', 'category' => 'Makanan Instan', 'unit' => 'PCS', 'minimum_stock' => 18, 'average_cost' => 18200, 'cost_method' => 'FIFO'],
            ['name' => 'Susu Kental Manis Kaleng', 'category' => 'Makanan Instan', 'unit' => 'PCS', 'minimum_stock' => 32, 'average_cost' => 12100, 'cost_method' => 'AVERAGE'],
            ['name' => 'Biskuit Kelapa 300 Gram', 'category' => 'Makanan Instan', 'unit' => 'PACK', 'minimum_stock' => 25, 'average_cost' => 9800, 'cost_method' => 'AVERAGE'],
            ['name' => 'Wafer Cokelat 145 Gram', 'category' => 'Makanan Instan', 'unit' => 'PACK', 'minimum_stock' => 28, 'average_cost' => 7600, 'cost_method' => 'AVERAGE'],
            ['name' => 'Kerupuk Udang Mentah 250 Gram', 'category' => 'Makanan Instan', 'unit' => 'PACK', 'minimum_stock' => 20, 'average_cost' => 10500, 'cost_method' => 'FIFO'],
            ['name' => 'Air Mineral 600 Ml', 'category' => 'Minuman Kemasan', 'unit' => 'DUS', 'minimum_stock' => 20, 'average_cost' => 45000, 'cost_method' => 'AVERAGE'],
            ['name' => 'Air Mineral Galon 19 Liter', 'category' => 'Minuman Kemasan', 'unit' => 'PCS', 'minimum_stock' => 16, 'average_cost' => 18500, 'cost_method' => 'AVERAGE'],
            ['name' => 'Teh Celup Isi 25', 'category' => 'Minuman Kemasan', 'unit' => 'PACK', 'minimum_stock' => 22, 'average_cost' => 8200, 'cost_method' => 'AVERAGE'],
            ['name' => 'Kopi Sachet Renceng', 'category' => 'Minuman Kemasan', 'unit' => 'RCG', 'minimum_stock' => 35, 'average_cost' => 14500, 'cost_method' => 'AVERAGE'],
            ['name' => 'Susu Bubuk Cokelat Sachet', 'category' => 'Minuman Kemasan', 'unit' => 'RCG', 'minimum_stock' => 30, 'average_cost' => 19500, 'cost_method' => 'AVERAGE'],
            ['name' => 'Minuman Serbuk Jeruk', 'category' => 'Minuman Kemasan', 'unit' => 'RCG', 'minimum_stock' => 26, 'average_cost' => 11200, 'cost_method' => 'AVERAGE'],
            ['name' => 'Sirup Cocopandan 620 Ml', 'category' => 'Minuman Kemasan', 'unit' => 'PCS', 'minimum_stock' => 15, 'average_cost' => 18700, 'cost_method' => 'FIFO'],
            ['name' => 'Teh Botol Kotak 200 Ml', 'category' => 'Minuman Kemasan', 'unit' => 'DUS', 'minimum_stock' => 18, 'average_cost' => 72000, 'cost_method' => 'AVERAGE'],
            ['name' => 'Deterjen Bubuk 800 Gram', 'category' => 'Kebutuhan Rumah Tangga', 'unit' => 'PACK', 'minimum_stock' => 20, 'average_cost' => 17600, 'cost_method' => 'AVERAGE'],
            ['name' => 'Sabun Cuci Piring 750 Ml', 'category' => 'Kebutuhan Rumah Tangga', 'unit' => 'PCS', 'minimum_stock' => 22, 'average_cost' => 13600, 'cost_method' => 'AVERAGE'],
            ['name' => 'Sabun Mandi Batang', 'category' => 'Kebutuhan Rumah Tangga', 'unit' => 'DUS', 'minimum_stock' => 12, 'average_cost' => 89000, 'cost_method' => 'AVERAGE'],
            ['name' => 'Pasta Gigi 190 Gram', 'category' => 'Kebutuhan Rumah Tangga', 'unit' => 'PCS', 'minimum_stock' => 24, 'average_cost' => 11800, 'cost_method' => 'AVERAGE'],
            ['name' => 'Tisu Gulung Isi 10', 'category' => 'Kebutuhan Rumah Tangga', 'unit' => 'PACK', 'minimum_stock' => 16, 'average_cost' => 24500, 'cost_method' => 'AVERAGE'],
            ['name' => 'Pembersih Lantai 780 Ml', 'category' => 'Kebutuhan Rumah Tangga', 'unit' => 'PCS', 'minimum_stock' => 18, 'average_cost' => 14200, 'cost_method' => 'AVERAGE'],
            ['name' => 'Obat Nyamuk Bakar', 'category' => 'Kebutuhan Rumah Tangga', 'unit' => 'DUS', 'minimum_stock' => 12, 'average_cost' => 64000, 'cost_method' => 'FIFO'],
            ['name' => 'Telur Ayam Ras 1 Kg', 'category' => 'Grosir Warung', 'unit' => 'KG', 'minimum_stock' => 30, 'average_cost' => 28500, 'cost_method' => 'FIFO'],
            ['name' => 'Gas LPG 3 Kg', 'category' => 'Grosir Warung', 'unit' => 'PCS', 'minimum_stock' => 20, 'average_cost' => 19000, 'cost_method' => 'FIFO'],
            ['name' => 'Rokok Filter Reguler', 'category' => 'Grosir Warung', 'unit' => 'SLOP', 'minimum_stock' => 10, 'average_cost' => 265000, 'cost_method' => 'AVERAGE'],
            ['name' => 'Plastik Kresek Ukuran Sedang', 'category' => 'Grosir Warung', 'unit' => 'PACK', 'minimum_stock' => 25, 'average_cost' => 12500, 'cost_method' => 'AVERAGE'],
            ['name' => 'Korek Api Gas Display Box', 'category' => 'Grosir Warung', 'unit' => 'BOX', 'minimum_stock' => 15, 'average_cost' => 36000, 'cost_method' => 'AVERAGE'],
        ]);

        $existingProducts = Product::query()
            ->orderBy('id')
            ->take($productRows->count())
            ->get()
            ->values();

        return $productRows->map(function (array $productData, int $index) use ($categories, $existingProducts, $units): Product {
            $sku = sprintf('SMB-%03d', $index + 1);
            $barcode = '899700'.str_pad((string) ($index + 1), 7, '0', STR_PAD_LEFT);
            $unit = $units->firstWhere('symbol', $productData['unit'])
                ?? $units->firstWhere('symbol', 'PCS');

            $product = Product::where('sku', $sku)->first()
                ?? $existingProducts->get($index)
                ?? new Product();

            $product->fill([
                'category_id' => $categories[$productData['category']]->id,
                'unit_id' => $unit->id,
                'sku' => $sku,
                'barcode' => $barcode,
                'name' => $productData['name'],
                'minimum_stock' => $productData['minimum_stock'],
                'average_cost' => $productData['average_cost'],
                'cost_method' => $productData['cost_method'],
                'status' => true,
                'valuation_method' => strtolower($productData['cost_method']),
                'unit' => strtolower($unit->symbol),
            ]);
            $product->save();

            return $product;
        });
    }

    private function seedSettings()
    {
        $settings = [
            ['key' => 'app.name', 'value' => 'IMS Pro'],
            ['key' => 'app.timezone', 'value' => 'Asia/Jakarta'],
            ['key' => 'app.default_language', 'value' => 'id'],
            ['key' => 'company.name', 'value' => 'IMS Multi-Gudang'],
            ['key' => 'company.email', 'value' => 'ops@example.com'],
            ['key' => 'company.phone', 'value' => '021-88889999'],
            ['key' => 'inventory.cost_method', 'value' => 'FIFO'],
            ['key' => 'inventory.low_stock_alert', 'value' => 'enabled'],
            ['key' => 'inventory.allow_negative_stock', 'value' => 'disabled'],
            ['key' => 'notification.email', 'value' => 'enabled'],
            ['key' => 'notification.low_stock', 'value' => 'enabled'],
            ['key' => 'notification.transfer', 'value' => 'enabled'],
            ['key' => 'security.session_timeout_minutes', 'value' => '120'],
            ['key' => 'security.password_min_length', 'value' => '8'],
            ['key' => 'security.force_2fa', 'value' => 'disabled'],
            ['key' => 'backup.enabled', 'value' => 'disabled'],
            ['key' => 'backup.schedule', 'value' => 'daily'],
            ['key' => 'backup.retention_days', 'value' => '30'],
            ['key' => 'api.rate_limit_per_minute', 'value' => '60'],
            ['key' => 'api.webhook_url', 'value' => ''],
            ['key' => 'api.token_rotation_days', 'value' => '90'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], ['value' => $setting['value']]);
        }
    }

    private function seedTransfers($warehouses, $products, $admin)
    {
        $statuses = ['DRAFT', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REJECTED'];
        
        for ($i = 0; $i < 10; $i++) {
            $source = $warehouses->random();
            $dest = $warehouses->where('id', '!=', $source->id)->random();
            $status = $statuses[array_rand($statuses)];
            
            $transfer = Transfer::create([
                'transfer_no' => 'TRF-' . now()->format('Ymd') . '-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'source_warehouse_id' => $source->id,
                'destination_warehouse_id' => $dest->id,
                'dest_warehouse_id' => $dest->id, // Fallback mapping based on schema
                'created_by' => $admin->id,
                'approved_by' => in_array($status, ['APPROVED', 'IN_TRANSIT', 'RECEIVED']) ? $admin->id : null,
                'received_by' => $status === 'RECEIVED' ? $admin->id : null,
                'in_transit_at' => in_array($status, ['IN_TRANSIT', 'RECEIVED']) ? now()->subDays(rand(1, 5)) : null,
                'received_at' => $status === 'RECEIVED' ? now()->subDays(rand(0, 2)) : null,
                'completed_at' => $status === 'RECEIVED' ? now()->subDays(rand(0, 2)) : null,
                'rejected_at' => $status === 'REJECTED' ? now()->subDays(rand(0, 2)) : null,
                'status' => $status,
                'notes' => 'Transfer logistik reguler.',
            ]);

            $transferProducts = $products->random(rand(2, 5));
            foreach ($transferProducts as $product) {
                TransferItem::create([
                    'transfer_id' => $transfer->id,
                    'product_id' => $product->id,
                    'quantity' => rand(5, 20),
                ]);
            }
        }
    }

    private function seedStockOpnames($warehouses, $products, $admin)
    {
        $statuses = ['DRAFT', 'COUNTING', 'REVIEW', 'APPROVED', 'ADJUSTED'];
        
        for ($i = 0; $i < 5; $i++) {
            $warehouse = $warehouses->random();
            $status = $statuses[array_rand($statuses)];
            
            $opname = StockOpname::create([
                'opname_no' => 'OPN-' . now()->format('Ymd') . '-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'warehouse_id' => $warehouse->id,
                'status' => $status,
                'performed_by' => $admin->id,
                'approved_by' => in_array($status, ['APPROVED', 'ADJUSTED']) ? $admin->id : null,
            ]);

            $opnameProducts = $products->random(rand(5, 10));
            foreach ($opnameProducts as $product) {
                $systemQty = rand(20, 100);
                $diff = rand(-5, 5);
                
                StockOpnameItem::create([
                    'stock_opname_id' => $opname->id,
                    'product_id' => $product->id,
                    'system_qty' => $systemQty,
                    'physical_qty' => in_array($status, ['COUNTING', 'DRAFT']) ? 0 : $systemQty + $diff,
                    'difference_qty' => in_array($status, ['COUNTING', 'DRAFT']) ? 0 : $diff,
                ]);
            }
        }
    }
}

