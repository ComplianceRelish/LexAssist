/**
 * Hierarchical document chunking for legal documents
 * Preserves document structure and section relationships
 */
class HierarchicalChunking {
  /**
   * Chunk a document using hierarchical chunking strategy
   * @param {string} text Document text content
   * @param {Object} strategy Chunking strategy configuration
   * @returns {Array} Array of chunk objects with text and structural metadata
   */
  async chunkDocument(text, strategy = {}) {
    const {
      chunkSize = 1000,
      overlapSize = 200,
      preserveSections = true,
      sectionDetectors = this._getDefaultSectionDetectors()
    } = strategy;

    // Extract document structure (sections, headings, etc.)
    const structure = this._extractDocumentStructure(text, sectionDetectors);
    
    // Create hierarchical chunks based on structure
    const chunks = [];
    
    if (!preserveSections || structure.sections.length === 0) {
      // Fallback to simple chunking if no sections detected or preservation not needed
      return this._createSimpleChunks(text, chunkSize, overlapSize);
    }
    
    // Create chunks respecting section boundaries
    const sectionsWithChunks = structure.sections.map(section => {
      const sectionChunks = this._chunkSection(
        section.text,
        chunkSize,
        overlapSize,
        section.level
      );
      
      return {
        ...section,
        chunks: sectionChunks
      };
    });
    
    // Flatten the hierarchical chunks while maintaining metadata
    let chunkIndex = 0;
    for (const section of sectionsWithChunks) {
      for (const chunkText of section.chunks) {
        chunks.push({
          text: chunkText,
          metadata: {
            section_title: section.title,
            section_level: section.level,
            section_index: section.index,
            section_type: section.type,
            chunk_index: chunkIndex,
            parent_section: section.parentIndex
          }
        });
        chunkIndex++;
      }
    }
    
    return chunks;
  }
  
  /**
   * Creates simple overlapping chunks when hierarchical chunking is not applicable
   * @private
   * @param {string} text Document text
   * @param {number} chunkSize Maximum chunk size
   * @param {number} overlapSize Overlap between chunks
   * @returns {Array} Array of chunk objects
   */
  _createSimpleChunks(text, chunkSize, overlapSize) {
    const chunks = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      chunks.push({
        text: text.substring(startIndex, endIndex),
        metadata: {
          chunk_index: chunks.length
        }
      });
      
      startIndex += (chunkSize - overlapSize);
    }
    
    return chunks;
  }
  
  /**
   * Chunks a section into smaller pieces while preserving paragraph boundaries
   * @private
   * @param {string} sectionText Section text content
   * @param {number} chunkSize Maximum chunk size
   * @param {number} overlapSize Overlap between chunks
   * @param {number} sectionLevel Section hierarchical level
   * @returns {Array} Array of text chunks
   */
  _chunkSection(sectionText, chunkSize, overlapSize, sectionLevel) {
    // Split by paragraphs to preserve paragraph boundaries
    const paragraphs = sectionText.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = "";
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size, finalize current chunk
      if (currentChunk.length + paragraph.length + 2 > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        // Start new chunk with overlap if possible
        const overlapText = this._createOverlap(currentChunk, overlapSize);
        currentChunk = overlapText + paragraph + "\n\n";
      } else {
        currentChunk += paragraph + "\n\n";
      }
    }
    
    // Add the last chunk if not empty
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  /**
   * Creates overlap text from previous chunk
   * @private
   * @param {string} text Previous chunk text
   * @param {number} overlapSize Desired overlap size
   * @returns {string} Overlap text
   */
  _createOverlap(text, overlapSize) {
    // Try to create overlap at sentence boundaries
    const lastPart = text.slice(-overlapSize * 2);
    const sentences = lastPart.match(/[^.!?]+[.!?]+/g) || [];
    
    if (sentences.length === 0) {
      // No clear sentences, just take characters
      return text.slice(-overlapSize);
    }
    
    // Take the last few sentences that fit within overlapSize
    let overlap = "";
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (overlap.length + sentences[i].length <= overlapSize) {
        overlap = sentences[i] + overlap;
      } else {
        break;
      }
    }
    
    return overlap;
  }
  
  /**
   * Extracts document structure (sections, headings) from text
   * @private
   * @param {string} text Document text
   * @param {Array} sectionDetectors Rules for detecting sections
   * @returns {Object} Document structure with sections
   */
  _extractDocumentStructure(text, sectionDetectors) {
    // Split document into lines
    const lines = text.split("\n");
    const sections = [];
    let currentSection = null;
    let currentSectionText = "";
    let sectionIndex = 0;
    
    for (const line of lines) {
      // Check if line matches any section detector pattern
      const matchedSection = this._matchSectionPattern(line, sectionDetectors);
      
      if (matchedSection) {
        // Save previous section if exists
        if (currentSection) {
          sections.push({
            ...currentSection,
            text: currentSectionText.trim()
          });
        }
        
        // Start new section
        currentSection = {
          title: matchedSection.title,
          level: matchedSection.level,
          type: matchedSection.type,
          index: sectionIndex++,
          parentIndex: this._findParentIndex(sections, matchedSection.level)
        };
        
        currentSectionText = line + "\n";
      } else if (currentSection) {
        // Add line to current section
        currentSectionText += line + "\n";
      } else {
        // Create default section for content before first detected section
        currentSection = {
          title: "Introduction",
          level: 0,
          type: "introduction",
          index: sectionIndex++,
          parentIndex: -1
        };
        
        currentSectionText = line + "\n";
      }
    }
    
    // Add the last section
    if (currentSection) {
      sections.push({
        ...currentSection,
        text: currentSectionText.trim()
      });
    }
    
    return { sections };
  }
  
  /**
   * Find parent section index for hierarchical structure
   * @private
   * @param {Array} sections Existing sections
   * @param {number} currentLevel Current section level
   * @returns {number} Parent section index or -1 if no parent
   */
  _findParentIndex(sections, currentLevel) {
    if (sections.length === 0 || currentLevel === 0) {
      return -1;
    }
    
    // Find the nearest section with lower level
    for (let i = sections.length - 1; i >= 0; i--) {
      if (sections[i].level < currentLevel) {
        return sections[i].index;
      }
    }
    
    return -1;
  }
  
  /**
   * Match a line against section detector patterns
   * @private
   * @param {string} line Text line
   * @param {Array} detectors Section detector patterns
   * @returns {Object|null} Matched section or null
   */
  _matchSectionPattern(line, detectors) {
    for (const detector of detectors) {
      const match = line.match(detector.pattern);
      if (match) {
        return {
          title: match[detector.titleGroup || 1].trim(),
          level: detector.level,
          type: detector.type
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get default section detector patterns for legal documents
   * @private
   * @returns {Array} Section detector patterns
   */
  _getDefaultSectionDetectors() {
    return [
      // Case judgment sections
      {
        pattern: /^(JUDGMENT|OPINION)(\s+OF\s+.+)?:/i,
        level: 1,
        type: 'judgment_main',
        titleGroup: 0
      },
      {
        pattern: /^([IVX]+\.\s+.+)$/,
        level: 2,
        type: 'main_section',
        titleGroup: 1
      },
      {
        pattern: /^(\d+\.\s+.+)$/,
        level: 3,
        type: 'numbered_section',
        titleGroup: 1
      },
      // Section headers with roman numerals
      {
        pattern: /^([IVX]+)\.\s+(.+)$/,
        level: 2,
        type: 'roman_numeral_section',
        titleGroup: 2
      },
      // Legislative sections
      {
        pattern: /^Section\s+(\d+[A-Z]?)\.?\s+(.+)$/i,
        level: 2,
        type: 'legislative_section',
        titleGroup: 2
      },
      // Headings with "In the matter of" patterns
      {
        pattern: /^In\s+the\s+matter\s+of\s+(.+)$/i,
        level: 1,
        type: 'case_title',
        titleGroup: 1
      },
      // Bold or uppercase headings
      {
        pattern: /^([A-Z\s]{5,})$/,
        level: 2,
        type: 'heading',
        titleGroup: 1
      }
    ];
  }
}

module.exports = {
  hierarchicalChunking: new HierarchicalChunking()
};
