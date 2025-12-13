import UploadedFileMetaDetails from '../models/UploadedFileMetaDetails.js';
import ROBillingData from '../models/ROBillingData.js';
import WarrantyData from '../models/WarrantyData.js';
import BookingListData from '../models/BookingListData.js';
import OperationsPartData from '../models/OperationsPartData.js';
import RepairOrderListData from '../models/RepairOrderListData.js';
import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Excel Upload Service
 * Implements 3-case upload logic for all file types:
 * Case 1: Brand new file (no matching unique keys)
 * Case 2: Reupload with exact same unique keys
 * Case 3: Mixed file (some existing, some new unique keys)
 */

class ExcelUploadService {
  
  /**
   * Get the appropriate model and unique key field based on file type
   */
  getModelConfig(fileType) {
    const configs = {
      'ro_billing': {
        model: ROBillingData,
        uniqueKey: 'RO_No',
        name: 'RO Billing'
      },
      'warranty': {
        model: WarrantyData,
        uniqueKey: 'claim_number',  // Changed from RO_No to claim_number to handle duplicates
        name: 'Warranty'
      },
      'booking_list': {
        model: BookingListData,
        uniqueKey: 'vin_number',  // Changed from Reg_No to vin_number
        name: 'Booking List'
      },
      'operations_part': {
        model: OperationsPartData,
        uniqueKey: 'OP_Part_Code',
        name: 'Operations/Part'
      },
      'repair_order_list': {
        model: RepairOrderListData,
        uniqueKey: 'vin',  // Changed from composite key to just VIN
        name: 'Repair Order List'
      }
    };
    
    return configs[fileType];
  }

  /**
   * Create file metadata record
   */
  async createFileMetadata(fileData, fileHash) {
    try {
      const metadata = new UploadedFileMetaDetails({
        db_file_name: fileData.db_file_name,
        uploaded_file_name: fileData.uploaded_file_name,
        rows_count: fileData.rows_count,
        uploaded_by: fileData.uploaded_by,
        org_id: fileData.org_id,
        showroom_id: fileData.showroom_id,
        file_type: fileData.file_type,
        file_size: fileData.file_size || 0,
        file_hash: fileHash,
        processing_status: 'processing'
      });
      
      const savedMetadata = await metadata.save();
      console.log(`✅ File metadata created: ${savedMetadata._id}`);
      console.log(`📋 File hash: ${fileHash}`);
      return savedMetadata;
    } catch (error) {
      console.error('❌ Error creating file metadata:', error);
      throw error;
    }
  }

  /**
   * Update file metadata status
   */
  async updateFileMetadataStatus(fileId, status, errorMessage = null) {
    try {
      const updateData = { processing_status: status };
      if (errorMessage) {
        updateData.error_message = errorMessage;
      }
      
      await UploadedFileMetaDetails.findByIdAndUpdate(fileId, updateData);
      console.log(`📊 File metadata updated: ${fileId} -> ${status}`);
    } catch (error) {
      console.error('❌ Error updating file metadata:', error);
    }
  }

  /**
   * Generate file hash for duplicate detection
   */
  generateFileHash(excelRows, fileType) {
    const dataString = JSON.stringify({
      fileType,
      rowCount: excelRows.length,
      firstRow: excelRows[0] || {},
      lastRow: excelRows[excelRows.length - 1] || {}
    });
    return crypto.createHash('md5').update(dataString).digest('hex');
  }

  /**
   * Check for duplicate file by hash
   */
  async checkDuplicateFile(fileHash, showroomId) {
    const duplicateFile = await UploadedFileMetaDetails.findOne({
      file_hash: fileHash,
      showroom_id: showroomId,
      processing_status: 'completed'
    });
    return duplicateFile;
  }

  /**
   * Analyze Excel data to determine which case applies
   */
  async analyzeExcelData(excelRows, fileType, showroomId, fileHash) {
    const config = this.getModelConfig(fileType);
    if (!config) {
      throw new Error(`Invalid file type: ${fileType}`);
    }

    const { model, uniqueKey } = config;
    
    // Check for duplicate file by hash
    const duplicateFile = await UploadedFileMetaDetails.findOne({
      file_hash: fileHash,
      showroom_id: showroomId,
      file_type: fileType,
      processing_status: 'completed'
    });

    // Extract unique keys from Excel
    console.log(`🔍 Looking for unique key field: ${uniqueKey}`);
    console.log(`📋 Sample Excel row:`, excelRows[0]);
    console.log(`📋 Available fields in Excel:`, Object.keys(excelRows[0] || {}));
    
    // Extract unique keys from Excel data
    let excelUniqueKeys;
    if (Array.isArray(uniqueKey)) {
      // Handle composite unique keys (for RepairOrderList)
      excelUniqueKeys = excelRows.map(row => 
        uniqueKey.map(key => row[key] || '').join('|')
      ).filter(key => key !== ''); // Remove empty composite keys
    } else {
      // Handle single unique keys
      excelUniqueKeys = excelRows.map(row => row[uniqueKey]).filter(key => key !== '');
    }

    // Find existing records
    let existingRecords;
    let existingKeys;

    if (Array.isArray(uniqueKey)) {
      // For composite keys, we need to check each component
      const keyConditions = excelUniqueKeys.map(compositeKey => {
        const keys = compositeKey.split('|');
        const condition = {};
        uniqueKey.forEach((key, index) => {
          condition[key] = keys[index];
        });
        return condition;
      });

      // Use $or to find any matching composite keys
      existingRecords = await model.find({
        $or: keyConditions,
        showroom_id: showroomId
      }).select([...uniqueKey, 'uploaded_file_id']);

      // Extract composite keys from existing records
      existingKeys = existingRecords.map(record => 
        uniqueKey.map(key => record[key] || '').join('|')
      );
    } else {
      // Single key handling (existing logic)
      existingRecords = await model.find({
        [uniqueKey]: { $in: excelUniqueKeys },
        showroom_id: showroomId
      }).select([uniqueKey, 'uploaded_file_id']);

      existingKeys = existingRecords.map(record => record[uniqueKey]);
    }

    const newKeys = excelUniqueKeys.filter(key => !existingKeys.includes(key));

    console.log(`📊 Analysis for ${config.name}:`);
    console.log(`   File Hash: ${fileHash}`);
    console.log(`   Duplicate File Found: ${duplicateFile ? 'Yes' : 'No'}`);
    console.log(`   Total Excel rows: ${excelRows.length}`);
    console.log(`   Unique keys in Excel: ${excelUniqueKeys.length}`);
    console.log(`   Existing keys: ${existingKeys.length}`);
    console.log(`   New keys: ${newKeys.length}`);

    // Determine case
    let uploadCase;
    if (duplicateFile) {
      uploadCase = 'CASE_2_DUPLICATE_FILE';
    } else if (existingKeys.length === 0) {
      uploadCase = 'CASE_1_NEW_FILE';
    } else {
      uploadCase = 'CASE_3_MIXED_FILE';
    }

    return {
      uploadCase,
      existingKeys,
      newKeys,
      excelUniqueKeys,
      totalRows: excelRows.length,
      duplicateFile,
      existingRecords
    };
  }

  /**
   * Process Excel data based on the determined case
   */
  async processExcelData(excelRows, fileMetadata, analysis) {
    const config = this.getModelConfig(fileMetadata.file_type);
    const { model, uniqueKey } = config;
    const { uploadCase, existingKeys, newKeys } = analysis;

    console.log(`🚀 Processing ${uploadCase} for ${config.name}`);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let insertedCount = 0;
      let updatedCount = 0;

      switch (uploadCase) {
        case 'CASE_1_NEW_FILE':
          insertedCount = await this.handleCase1NewFile(excelRows, fileMetadata, model, session);
          break;
          
        case 'CASE_2_DUPLICATE_FILE':
          updatedCount = await this.handleCase2DuplicateFile(excelRows, fileMetadata, model, uniqueKey, analysis.existingRecords, session);
          break;
          
        case 'CASE_3_MIXED_FILE':
          const result = await this.handleCase3MixedFile(excelRows, fileMetadata, model, uniqueKey, existingKeys, newKeys, analysis.existingRecords, session);
          insertedCount = result.insertedCount;
          updatedCount = result.updatedCount;
          break;
      }

      await session.commitTransaction();
      
      console.log(`✅ Processing completed:`);
      console.log(`   Inserted: ${insertedCount} rows`);
      console.log(`   Updated: ${updatedCount} rows`);

      return { insertedCount, updatedCount };
      
    } catch (error) {
      await session.abortTransaction();
      console.error(`❌ Error processing ${uploadCase}:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * CASE 1: New file - insert all rows with uploaded_file_id (with upsert for duplicates)
   */
  async handleCase1NewFile(excelRows, fileMetadata, model, session) {
    console.log('📝 CASE 1: Inserting all rows as new records (with upsert for duplicates)');
    
    const config = this.getModelConfig(fileMetadata.file_type);
    const { uniqueKey } = config;
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    // Use upsert operations to handle potential duplicates
    for (const row of excelRows) {
      const documentData = {
        ...row,
        uploaded_file_id: fileMetadata._id,
        showroom_id: fileMetadata.showroom_id,
        updated_at: new Date()
      };
      
      let queryCondition;
      
      if (Array.isArray(uniqueKey)) {
        // Handle composite unique keys (like repair_order_list)
        queryCondition = {};
        uniqueKey.forEach(key => {
          queryCondition[key] = row[key];
        });
        queryCondition.showroom_id = fileMetadata.showroom_id;
      } else {
        // Handle single unique key (like booking_list Reg_No)
        queryCondition = {
          [uniqueKey]: row[uniqueKey],
          showroom_id: fileMetadata.showroom_id
        };
      }
      
      try {
        const result = await model.findOneAndUpdate(
          queryCondition,
          {
            $set: documentData,
            $setOnInsert: { created_at: new Date() }
          },
          {
            upsert: true,
            new: true,
            session: session
          }
        );
        
        // Check if it was an insert or update
        if (result.created_at && result.created_at.getTime() === result.updated_at.getTime()) {
          insertedCount++;
        } else {
          updatedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error upserting record with ${uniqueKey}:`, Array.isArray(uniqueKey) ? uniqueKey.map(k => row[k]) : row[uniqueKey], error.message);
        throw error;
      }
    }
    
    console.log(`✅ CASE 1 completed: ${insertedCount} inserted, ${updatedCount} updated with uploaded_file_id: ${fileMetadata._id}`);
    return insertedCount;
  }

  /**
   * CASE 2: Duplicate file - update existing rows and set new uploaded_file_id
   */
  async handleCase2DuplicateFile(excelRows, fileMetadata, model, uniqueKey, existingRecords, session) {
    console.log('🔄 CASE 2: Updating existing rows for duplicate file');
    
    let updatedCount = 0;
    
    for (const row of excelRows) {
      let existingRecord;
      let queryCondition;
      
      if (Array.isArray(uniqueKey)) {
        // Handle composite unique keys
        const compositeKey = uniqueKey.map(key => row[key] || '').join('|');
        existingRecord = existingRecords.find(record => 
          uniqueKey.map(key => record[key] || '').join('|') === compositeKey
        );
        
        // Build query condition for composite key
        queryCondition = {};
        uniqueKey.forEach(key => {
          queryCondition[key] = row[key];
        });
      } else {
        // Handle single unique key
        existingRecord = existingRecords.find(record => record[uniqueKey] === row[uniqueKey]);
        queryCondition = { [uniqueKey]: row[uniqueKey] };
      }
      
      const updateData = {
        ...row,
        uploaded_file_id: fileMetadata._id,  // Update to new file metadata ID
        updated_at: new Date()
      };
      
      // Handle amount fields properly for RO Billing and Warranty
      if (fileMetadata.file_type === 'ro_billing') {
        // For RO billing, update amounts properly
        if (row.labour_amount !== undefined) updateData.labour_amount = row.labour_amount;
        if (row.parts_amount !== undefined) updateData.parts_amount = row.parts_amount;
        if (row.total_amount !== undefined) updateData.total_amount = row.total_amount;
      } else if (fileMetadata.file_type === 'warranty') {
        // For warranty, update claim amounts properly
        if (row.labour_amount !== undefined) updateData.labour_amount = row.labour_amount;
        if (row.part_amount !== undefined) updateData.part_amount = row.part_amount;
        if (row.total_claim_amount !== undefined) updateData.total_claim_amount = row.total_claim_amount;
      }
      
      // Remove the unique key(s) from update data to avoid conflicts
      if (Array.isArray(uniqueKey)) {
        uniqueKey.forEach(key => delete updateData[key]);
      } else {
        delete updateData[uniqueKey];
      }
      
      const result = await model.updateOne(
        {
          ...queryCondition,
          showroom_id: fileMetadata.showroom_id
        },
        { $set: updateData },
        { session }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
        const keyDisplay = Array.isArray(uniqueKey) 
          ? uniqueKey.map(key => row[key]).join('|')
          : row[uniqueKey];
        console.log(`📝 Updated ${Array.isArray(uniqueKey) ? 'composite key' : uniqueKey}: ${keyDisplay} with new data`);
      }
    }
    
    console.log(`✅ Updated ${updatedCount} existing records with new uploaded_file_id: ${fileMetadata._id}`);
    return updatedCount;
  }

  /**
   * CASE 3: Mixed file - update existing, insert new (both with uploaded_file_id)
   */
  async handleCase3MixedFile(excelRows, fileMetadata, model, uniqueKey, existingKeys, newKeys, existingRecords, session) {
    console.log('🔀 CASE 3: Mixed processing - updating existing and inserting new');
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    // Separate rows into existing and new
    let existingRows, newRows;
    
    if (Array.isArray(uniqueKey)) {
      // Handle composite unique keys
      existingRows = excelRows.filter(row => {
        const compositeKey = uniqueKey.map(key => row[key] || '').join('|');
        return existingKeys.includes(compositeKey);
      });
      newRows = excelRows.filter(row => {
        const compositeKey = uniqueKey.map(key => row[key] || '').join('|');
        return newKeys.includes(compositeKey);
      });
    } else {
      // Handle single unique keys
      existingRows = excelRows.filter(row => existingKeys.includes(row[uniqueKey]));
      newRows = excelRows.filter(row => newKeys.includes(row[uniqueKey]));
    }
    
    // Update existing rows with new uploaded_file_id and proper amount handling
    for (const row of existingRows) {
      let existingRecord;
      let queryCondition;
      
      if (Array.isArray(uniqueKey)) {
        // Handle composite unique keys
        const compositeKey = uniqueKey.map(key => row[key] || '').join('|');
        existingRecord = existingRecords.find(record => 
          uniqueKey.map(key => record[key] || '').join('|') === compositeKey
        );
        
        // Build query condition for composite key
        queryCondition = {};
        uniqueKey.forEach(key => {
          queryCondition[key] = row[key];
        });
      } else {
        // Handle single unique key
        existingRecord = existingRecords.find(record => record[uniqueKey] === row[uniqueKey]);
        queryCondition = { [uniqueKey]: row[uniqueKey] };
      }
      
      const updateData = {
        ...row,
        uploaded_file_id: fileMetadata._id,  // Update to new file metadata ID
        updated_at: new Date()
      };
      
      // Handle amount fields properly for RO Billing and Warranty
      if (fileMetadata.file_type === 'ro_billing') {
        // For RO billing, update amounts properly
        if (row.labour_amount !== undefined) updateData.labour_amount = row.labour_amount;
        if (row.parts_amount !== undefined) updateData.parts_amount = row.parts_amount;
        if (row.total_amount !== undefined) updateData.total_amount = row.total_amount;
      } else if (fileMetadata.file_type === 'warranty') {
        // For warranty, update claim amounts properly
        if (row.labour_amount !== undefined) updateData.labour_amount = row.labour_amount;
        if (row.part_amount !== undefined) updateData.part_amount = row.part_amount;
        if (row.total_claim_amount !== undefined) updateData.total_claim_amount = row.total_claim_amount;
      }
      
      // Remove the unique key(s) from update data to avoid conflicts
      if (Array.isArray(uniqueKey)) {
        uniqueKey.forEach(key => delete updateData[key]);
      } else {
        delete updateData[uniqueKey];
      }
      
      const result = await model.updateOne(
        {
          ...queryCondition,
          showroom_id: fileMetadata.showroom_id
        },
        { $set: updateData },
        { session }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
        const keyDisplay = Array.isArray(uniqueKey) 
          ? uniqueKey.map(key => row[key]).join('|')
          : row[uniqueKey];
        console.log(`📝 Updated ${Array.isArray(uniqueKey) ? 'composite key' : uniqueKey}: ${keyDisplay} with new data in mixed file`);
      }
    }
    
    // Insert new rows with uploaded_file_id
    if (newRows.length > 0) {
      const documentsToInsert = newRows.map(row => ({
        ...row,
        uploaded_file_id: fileMetadata._id,  // Set foreign key to file metadata
        showroom_id: fileMetadata.showroom_id,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const result = await model.insertMany(documentsToInsert, { session });
      insertedCount = result.length;
      console.log(`✅ Inserted ${insertedCount} new records with uploaded_file_id: ${fileMetadata._id}`);
    }
    
    console.log(`✅ Mixed processing completed:`);
    console.log(`   Updated ${updatedCount} existing records with uploaded_file_id: ${fileMetadata._id}`);
    console.log(`   Inserted ${insertedCount} new records with uploaded_file_id: ${fileMetadata._id}`);
    
    return { insertedCount, updatedCount };
  }

  /**
   * Main upload method - orchestrates the entire process
   */
  async uploadExcel(fileData, excelRows) {
    console.log(`🎯 Starting Excel upload for ${fileData.file_type}`);
    console.log(`   File: ${fileData.uploaded_file_name}`);
    console.log(`   Rows: ${excelRows.length}`);
    console.log(`   Showroom: ${fileData.showroom_id}`);
    
    let fileMetadata;
    
    try {
      // Step 1: Generate file hash for duplicate detection
      const fileHash = this.generateFileHash(excelRows, fileData.file_type);
      
      // Step 2: Create file metadata with hash
      fileMetadata = await this.createFileMetadata(fileData, fileHash);
      
      // Step 3: Analyze Excel data to determine case
      const analysis = await this.analyzeExcelData(excelRows, fileData.file_type, fileData.showroom_id, fileHash);
      
      // Step 4: Process data based on case with proper uploaded_file_id handling
      const result = await this.processExcelData(excelRows, fileMetadata, analysis);
      
      // Step 5: Update metadata with case information and completion status
      await UploadedFileMetaDetails.findByIdAndUpdate(fileMetadata._id, {
        processing_status: 'completed',
        upload_case: analysis.uploadCase,
        rows_inserted: result.insertedCount || 0,
        rows_updated: result.updatedCount || 0,
        updated_at: new Date()
      });
      
      console.log(`🎉 Excel upload completed successfully!`);
      console.log(`📋 All records now have uploaded_file_id: ${fileMetadata._id}`);
      console.log(`📊 Case: ${analysis.uploadCase}, Inserted: ${result.insertedCount}, Updated: ${result.updatedCount}`);
      
      return {
        success: true,
        fileId: fileMetadata._id,
        uploadCase: analysis.uploadCase,
        insertedCount: result.insertedCount,
        updatedCount: result.updatedCount,
        totalProcessed: result.insertedCount + result.updatedCount,
        fileHash: fileHash,
        message: `Successfully processed ${result.insertedCount + result.updatedCount} rows using ${analysis.uploadCase}`
      };
      
    } catch (error) {
      console.error('❌ Excel upload failed:', error);
      
      if (fileMetadata) {
        await this.updateFileMetadataStatus(fileMetadata._id, 'failed', error.message);
      }
      
      return {
        success: false,
        error: error.message,
        fileId: fileMetadata?._id
      };
    }
  }

  /**
   * Get upload history for a showroom
   */
  async getUploadHistory(showroomId, fileType = null, limit = 50) {
    try {
      const query = { showroom_id: showroomId };
      if (fileType) {
        query.file_type = fileType;
      }
      
      const history = await UploadedFileMetaDetails
        .find(query)
        .sort({ uploaded_at: -1 })
        .limit(limit)
        .lean();
      
      return history;
    } catch (error) {
      console.error('❌ Error fetching upload history:', error);
      throw error;
    }
  }

  /**
   * Get detailed upload statistics
   */
  async getUploadStats(showroomId, fileType = null) {
    try {
      const matchStage = { showroom_id: new mongoose.Types.ObjectId(showroomId) };
      if (fileType) {
        matchStage.file_type = fileType;
      }
      
      const stats = await UploadedFileMetaDetails.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$file_type',
            totalFiles: { $sum: 1 },
            totalRows: { $sum: '$rows_count' },
            successfulUploads: {
              $sum: { $cond: [{ $eq: ['$processing_status', 'completed'] }, 1, 0] }
            },
            failedUploads: {
              $sum: { $cond: [{ $eq: ['$processing_status', 'failed'] }, 1, 0] }
            },
            lastUpload: { $max: '$uploaded_at' }
          }
        }
      ]);
      
      return stats;
    } catch (error) {
      console.error('❌ Error fetching upload stats:', error);
      throw error;
    }
  }
}

export default new ExcelUploadService();
