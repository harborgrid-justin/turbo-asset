import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { machineLearningService } from './MachineLearningService';
import {
  NLPModel,
  TicketClassification,
  TicketCategory,
  TicketPriority,
  ExtractedEntity,
  SentimentScore,
  MLModel
} from '@/types/machinelearning';

/**
 * NLPService - Natural Language Processing for automated ticket classification
 * Provides intelligent text analysis for support tickets, facility requests, and feedback processing
 */
export class NLPService extends EventEmitter {
  private ticketClassificationModel?: MLModel;
  private sentimentAnalysisModel?: MLModel;
  private entityExtractionModel?: MLModel;
  private textSummarizationModel?: MLModel;
  private priorityClassificationModel?: MLModel;

  private readonly supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl'];
  private readonly ticketCategories = [
    'HVAC', 'ELECTRICAL', 'PLUMBING', 'CLEANING', 'SECURITY', 'ACCESS_CONTROL',
    'IT_SUPPORT', 'FURNITURE', 'LIGHTING', 'FACILITY_REQUEST', 'MAINTENANCE',
    'SAFETY', 'CATERING', 'PARKING', 'GENERAL_INQUIRY', 'COMPLAINT', 'OTHER'
  ];
  
  private readonly departmentKeywords = {
    'FACILITIES': ['hvac', 'air', 'temperature', 'hot', 'cold', 'clean', 'dirty', 'repair', 'fix', 'broken'],
    'IT': ['computer', 'laptop', 'wifi', 'internet', 'email', 'software', 'hardware', 'network', 'printer'],
    'SECURITY': ['access', 'badge', 'lock', 'unlock', 'card', 'entry', 'door', 'alarm', 'camera'],
    'HR': ['parking', 'desk', 'office', 'move', 'relocation', 'space', 'booking', 'reservation'],
    'CATERING': ['food', 'kitchen', 'coffee', 'water', 'vending', 'cafeteria', 'dining']
  };

  constructor() {
    super();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      logger.info('Initializing NLP Service');

      // Initialize ticket classification model
      this.ticketClassificationModel = await machineLearningService.registerModel(
        'Ticket Classifier',
        'NLP',
        {
          algorithm: 'TRANSFORMER_BERT',
          architecture: 'CLASSIFICATION',
          language: 'multi',
          maxSequenceLength: 512,
          categories: this.ticketCategories,
          preprocessingSteps: ['tokenize', 'lowercase', 'remove_stopwords', 'lemmatize']
        },
        {
          trainingDataSize: 500000,
          features: [
            'text_content',
            'subject_line',
            'user_department',
            'historical_patterns',
            'keyword_frequency',
            'text_length',
            'urgency_indicators'
          ],
          target: 'ticket_category',
          algorithm: 'TRANSFORMER_BERT'
        }
      );

      // Initialize sentiment analysis model
      this.sentimentAnalysisModel = await machineLearningService.registerModel(
        'Sentiment Analyzer',
        'NLP',
        {
          algorithm: 'ROBERTA_FINETUNED',
          architecture: 'SENTIMENT_ANALYSIS',
          language: 'multi',
          sentimentClasses: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'],
          aspectBasedSentiment: true,
          emotionDetection: true
        }
      );

      // Initialize entity extraction model
      this.entityExtractionModel = await machineLearningService.registerModel(
        'Entity Extractor',
        'NLP',
        {
          algorithm: 'SPACY_NER_CUSTOM',
          architecture: 'ENTITY_EXTRACTION',
          language: 'multi',
          entityTypes: ['LOCATION', 'ASSET', 'PERSON', 'ORGANIZATION', 'ISSUE_TYPE', 'TIME', 'ROOM', 'BUILDING'],
          customEntities: true
        }
      );

      // Initialize text summarization model
      this.textSummarizationModel = await machineLearningService.registerModel(
        'Text Summarizer',
        'NLP',
        {
          algorithm: 'BART_SUMMARIZATION',
          architecture: 'SUMMARIZATION',
          summaryType: 'EXTRACTIVE_ABSTRACTIVE',
          maxSummaryLength: 150,
          keywordExtraction: true
        }
      );

      // Initialize priority classification model
      this.priorityClassificationModel = await machineLearningService.registerModel(
        'Priority Classifier',
        'NLP',
        {
          algorithm: 'GRADIENT_BOOSTING_TEXT',
          architecture: 'CLASSIFICATION',
          priorityLevels: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          urgencyKeywords: ['urgent', 'emergency', 'asap', 'critical', 'broken', 'not working', 'help'],
          businessImpactFactors: true
        }
      );

      // Train all models
      await this.trainNLPModels();

      logger.info('NLP Service initialized successfully');
      this.emit('service:initialized');

    } catch (error: unknown) {
      logger.error('Failed to initialize NLP Service', error);
      throw error;
    }
  }

  /**
   * Classify and analyze support tickets
   */
  async classifyTicket(
    ticketId: string,
    content: string,
    options: {
      subject?: string;
      userDepartment?: string;
      language?: string;
      includeEntities?: boolean;
      includeSentiment?: boolean;
      generateSummary?: boolean;
    } = {}
  ): Promise<TicketClassification> {
    try {
      const {
        subject = '',
        userDepartment,
        language = 'en',
        includeEntities = true,
        includeSentiment = true,
        generateSummary = false
      } = options;

      logger.info('Classifying ticket', {
        ticketId,
        language,
        contentLength: content.length,
        includeEntities,
        includeSentiment
      });

      // Preprocess text
      const processedText = await this.preprocessText(content, language);
      const processedSubject = await this.preprocessText(subject, language);
      const combinedText = `${processedSubject} ${processedText}`.trim();

      // Classify ticket category
      const categoryResult = await this.classifyCategory(combinedText, userDepartment);

      // Classify priority
      const priorityResult = await this.classifyPriority(combinedText, categoryResult.category);

      // Extract entities if requested
      let extractedEntities: ExtractedEntity[] = [];
      if (includeEntities) {
        extractedEntities = await this.extractEntities(combinedText, language);
      }

      // Analyze sentiment if requested
      let sentiment: SentimentScore = {
        overall: 0,
        positive: 0,
        negative: 0,
        neutral: 1,
        confidence: 0
      };
      
      if (includeSentiment) {
        sentiment = await this.analyzeSentiment(combinedText, language);
      }

      // Generate summary if requested
      let summary: string | undefined;
      if (generateSummary && content.length > 200) {
        summary = await this.summarizeText(content, language);
      }

      // Determine department routing
      const suggestedDepartment = this.determineDepartment(categoryResult.category, extractedEntities, userDepartment);

      // Calculate confidence score
      const overallConfidence = this.calculateOverallConfidence(categoryResult, priorityResult, extractedEntities);

      const classification: TicketClassification = {
        ticketId,
        content: combinedText,
        predictedCategory: categoryResult,
        predictedPriority: priorityResult,
        predictedDepartment: suggestedDepartment,
        confidence: overallConfidence,
        extractedEntities,
        sentiment,
        ...(summary && { summary }),
        language,
        processingTimestamp: new Date(),
        ...(userDepartment && { originalDepartment: userDepartment })
      };

      // Log classification results
      logger.info('Ticket classification completed', {
        ticketId,
        category: categoryResult.category,
        priority: priorityResult.level,
        department: suggestedDepartment,
        confidence: overallConfidence,
        entitiesFound: extractedEntities.length
      });

      // Emit classification event for downstream processing
      this.emit('ticket:classified', {
        ticketId,
        classification,
        requiresEscalation: priorityResult.level === 'URGENT' || priorityResult.level === 'HIGH',
        suggestedAssignee: await this.suggestAssignee(classification)
      });

      return classification;

    } catch (error: unknown) {
      logger.error('Failed to classify ticket', { ticketId, error });
      throw error;
    }
  }

  /**
   * Batch classify multiple tickets
   */
  async batchClassifyTickets(
    tickets: Array<{
      ticketId: string;
      content: string;
      subject?: string;
      userDepartment?: string;
      language?: string;
    }>,
    options: {
      includeEntities?: boolean;
      includeSentiment?: boolean;
      maxConcurrency?: number;
    } = {}
  ): Promise<TicketClassification[]> {
    try {
      const {
        includeEntities = true,
        includeSentiment = true,
        maxConcurrency = 10
      } = options;

      logger.info('Starting batch ticket classification', {
        ticketsCount: tickets.length,
        maxConcurrency
      });

      const startTime = Date.now();
      const results: TicketClassification[] = [];

      // Process tickets in batches to avoid overwhelming the system
      const chunks = this.chunkArray(tickets, maxConcurrency);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(ticket =>
          this.classifyTicket(ticket.ticketId, ticket.content, {
            subject: ticket.subject,
            userDepartment: ticket.userDepartment,
            language: ticket.language,
            includeEntities,
            includeSentiment,
            generateSummary: false // Disable summary for batch processing
          }).catch(error => ({
            ticketId: ticket.ticketId,
            error: (error as Error).message,
            content: ticket.content,
            predictedCategory: { category: 'OTHER', confidence: 0 },
            predictedPriority: { level: 'MEDIUM', confidence: 0, reasoning: 'Error in processing' },
            predictedDepartment: 'GENERAL',
            confidence: 0,
            extractedEntities: [],
            sentiment: { overall: 0, positive: 0, negative: 0, neutral: 1, confidence: 0 }
          }))
        );
        
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }

      const processingTime = Date.now() - startTime;
      const successfulClassifications = results.filter(r => !('error' in r));
      const failedClassifications = results.filter(r => 'error' in r);

      logger.info('Batch ticket classification completed', {
        totalTickets: tickets.length,
        successful: successfulClassifications.length,
        failed: failedClassifications.length,
        processingTime,
        averageTime: processingTime / tickets.length
      });

      // Emit batch completion event
      this.emit('batch:classified', {
        totalTickets: tickets.length,
        successfulClassifications: successfulClassifications.length,
        failedClassifications: failedClassifications.length,
        processingTime,
        results: successfulClassifications
      });

      return results;

    } catch (error: unknown) {
      logger.error('Failed to batch classify tickets', { error });
      throw error;
    }
  }

  /**
   * Analyze text sentiment with aspect-based analysis
   */
  async analyzeSentiment(
    text: string,
    language: string = 'en',
    options: {
      includeAspects?: boolean;
      includeEmotions?: boolean;
    } = {}
  ): Promise<SentimentScore & any> {
    try {
      const {
        includeAspects = true,
        includeEmotions = false
      } = options;

      if (!this.sentimentAnalysisModel) {
        throw new Error('Sentiment analysis model not available');
      }

      // Preprocess text for sentiment analysis
      const processedText = await this.preprocessText(text, language);
      const features = await this.extractSentimentFeatures(processedText, language);

      // Run sentiment analysis
      const prediction = await machineLearningService.predict(
        this.sentimentAnalysisModel.id,
        features,
        { includeConfidence: true }
      );

      // Extract sentiment scores
      const sentimentResult = prediction.prediction;
      
      let aspectSentiments = [];
      if (includeAspects) {
        aspectSentiments = await this.extractAspectSentiments(processedText);
      }

      let emotions = [];
      if (includeEmotions) {
        emotions = await this.detectEmotions(processedText);
      }

      const sentimentScore: SentimentScore & any = {
        overall: sentimentResult.overall || 0,
        positive: sentimentResult.positive || 0,
        negative: sentimentResult.negative || 0,
        neutral: sentimentResult.neutral || 1,
        confidence: prediction.confidence,
        ...(includeAspects && { aspects: aspectSentiments }),
        ...(includeEmotions && { emotions }),
        language,
        textLength: text.length,
        processingTime: prediction.processingTime
      };

      return sentimentScore;

    } catch (error: unknown) {
      logger.error('Failed to analyze sentiment', { error });
      throw error;
    }
  }

  /**
   * Extract named entities from text
   */
  async extractEntities(
    text: string,
    language: string = 'en',
    options: {
      entityTypes?: string[];
      includeCustomEntities?: boolean;
    } = {}
  ): Promise<ExtractedEntity[]> {
    try {
      const {
        entityTypes = ['LOCATION', 'ASSET', 'PERSON', 'ORGANIZATION', 'ISSUE_TYPE'],
        includeCustomEntities = true
      } = options;

      if (!this.entityExtractionModel) {
        throw new Error('Entity extraction model not available');
      }

      // Preprocess text
      const processedText = await this.preprocessText(text, language);
      const features = await this.extractEntityFeatures(processedText, language);

      // Run entity extraction
      const prediction = await machineLearningService.predict(
        this.entityExtractionModel.id,
        features,
        { includeConfidence: true }
      );

      // Process extraction results
      const extractedEntities: ExtractedEntity[] = [];
      const entities = prediction.prediction.entities || [];

      for (const entity of entities) {
        if (entityTypes.includes(entity.type) && entity.confidence > 0.5) {
          extractedEntities.push({
            type: entity.type as any,
            value: entity.value,
            confidence: entity.confidence,
            startIndex: entity.startIndex || 0,
            endIndex: entity.endIndex || entity.value.length
          });
        }
      }

      // Add custom facility-specific entities if enabled
      if (includeCustomEntities) {
        const customEntities = await this.extractCustomEntities(processedText);
        extractedEntities.push(...customEntities);
      }

      // Sort by confidence and remove duplicates
      return this.deduplicateEntities(
        extractedEntities.sort((a, b) => b.confidence - a.confidence)
      );

    } catch (error: unknown) {
      logger.error('Failed to extract entities', { error });
      return [];
    }
  }

  /**
   * Summarize long text content
   */
  async summarizeText(
    text: string,
    language: string = 'en',
    options: {
      maxLength?: number;
      summaryType?: 'EXTRACTIVE' | 'ABSTRACTIVE' | 'HYBRID';
      includeKeywords?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const {
        maxLength = 150,
        summaryType = 'HYBRID',
        includeKeywords = false
      } = options;

      if (!this.textSummarizationModel) {
        throw new Error('Text summarization model not available');
      }

      if (text.length < 200) {
        return text; // No need to summarize short text
      }

      // Preprocess text
      const processedText = await this.preprocessText(text, language);
      const features = await this.extractSummarizationFeatures(processedText, language);

      features.max_length = maxLength;
      features.summary_type = summaryType;

      // Generate summary
      const prediction = await machineLearningService.predict(
        this.textSummarizationModel.id,
        features,
        { includeConfidence: true }
      );

      let summary = prediction.prediction.summary || text.substring(0, maxLength) + '...';

      // Add keywords if requested
      if (includeKeywords) {
        const keywords = await this.extractKeywords(processedText);
        if (keywords.length > 0) {
          summary += `\nKey topics: ${keywords.slice(0, 5).join(', ')}`;
        }
      }

      return summary;

    } catch (error: unknown) {
      logger.error('Failed to summarize text', { error });
      return text.substring(0, 150) + '...';
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    try {
      // Simulate language detection
      const commonWords = {
        'en': ['the', 'is', 'and', 'to', 'of', 'a', 'in', 'for', 'with', 'on'],
        'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se'],
        'fr': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'],
        'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich']
      };

      const words = text.toLowerCase().split(/\s+/);
      const languageScores: Record<string, number> = {};

      for (const [lang, wordList] of Object.entries(commonWords)) {
        const matches = words.filter(word => wordList.includes(word)).length;
        languageScores[lang] = matches / words.length;
      }

      const detectedLanguage = Object.entries(languageScores)
        .sort(([, a], [, b]) => b - a)[0];

      return {
        language: detectedLanguage ? detectedLanguage[0] : 'en',
        confidence: detectedLanguage ? detectedLanguage[1] : 0.5
      };

    } catch (error: unknown) {
      logger.error('Failed to detect language', { error });
      return { language: 'en', confidence: 0.5 };
    }
  }

  /**
   * Private: Text preprocessing methods
   */
  private async preprocessText(text: string, language: string = 'en'): Promise<string> {
    // Basic text preprocessing
    let processed = text.toLowerCase().trim();
    
    // Remove excessive whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    // Remove HTML tags if present
    processed = processed.replace(/<[^>]*>/g, ' ');
    
    // Remove special characters but keep punctuation
    processed = processed.replace(/[^\w\s.,!?;:-]/g, ' ');
    
    // Remove extra spaces
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  /**
   * Private: Classification methods
   */
  private async classifyCategory(text: string, userDepartment?: string): Promise<TicketCategory> {
    try {
      if (!this.ticketClassificationModel) {
        throw new Error('Ticket classification model not available');
      }

      const features = await this.extractClassificationFeatures(text, userDepartment);
      
      const prediction = await machineLearningService.predict(
        this.ticketClassificationModel.id,
        features,
        { includeConfidence: true }
      );

      // Use keyword-based fallback if ML prediction confidence is low
      let category = prediction.prediction.category;
      let confidence = prediction.confidence;

      if (confidence < 0.6) {
        const keywordClassification = this.classifyByKeywords(text);
        if (keywordClassification.confidence > confidence) {
          category = keywordClassification.category;
          confidence = keywordClassification.confidence;
        }
      }

      return {
        category,
        subcategory: prediction.prediction.subcategory,
        confidence
      };

    } catch (error: unknown) {
      logger.debug('Classification failed, using keyword fallback', { error });
      return this.classifyByKeywords(text);
    }
  }

  private async classifyPriority(text: string, category: string): Promise<TicketPriority> {
    try {
      if (!this.priorityClassificationModel) {
        throw new Error('Priority classification model not available');
      }

      const features = await this.extractPriorityFeatures(text, category);
      
      const prediction = await machineLearningService.predict(
        this.priorityClassificationModel.id,
        features,
        { includeConfidence: true }
      );

      // Check for urgent keywords that might override ML prediction
      const urgencyIndicators = this.detectUrgencyIndicators(text);
      let level = prediction.prediction.priority_level;
      let confidence = prediction.confidence;
      let reasoning = prediction.prediction.reasoning || 'Based on content analysis';

      if (urgencyIndicators.isUrgent && urgencyIndicators.confidence > 0.8) {
        level = 'URGENT';
        confidence = urgencyIndicators.confidence;
        reasoning = `Urgent keywords detected: ${urgencyIndicators.keywords.join(', ')}`;
      }

      return {
        level: level as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        confidence,
        reasoning
      };

    } catch (error: unknown) {
      logger.debug('Priority classification failed, using heuristics', { error });
      return this.classifyPriorityByHeuristics(text);
    }
  }

  /**
   * Private: Feature extraction methods
   */
  private async extractClassificationFeatures(text: string, userDepartment?: string): Promise<any> {
    return {
      text_content: text,
      text_length: text.length,
      word_count: text.split(/\s+/).length,
      user_department: userDepartment || 'unknown',
      has_urgent_keywords: this.hasUrgentKeywords(text),
      keyword_frequencies: this.calculateKeywordFrequencies(text),
      sentence_count: text.split(/[.!?]+/).length,
      question_marks: (text.match(/\?/g) || []).length,
      exclamation_marks: (text.match(/!/g) || []).length,
      caps_ratio: this.calculateCapsRatio(text)
    };
  }

  private async extractSentimentFeatures(text: string, language: string): Promise<any> {
    return {
      text_content: text,
      language,
      text_length: text.length,
      positive_keywords: this.countPositiveKeywords(text),
      negative_keywords: this.countNegativeKeywords(text),
      sentiment_indicators: this.extractSentimentIndicators(text),
      emotion_keywords: this.extractEmotionKeywords(text)
    };
  }

  private async extractEntityFeatures(text: string, language: string): Promise<any> {
    return {
      text_content: text,
      language,
      capitalized_words: this.extractCapitalizedWords(text),
      location_indicators: this.extractLocationIndicators(text),
      asset_indicators: this.extractAssetIndicators(text),
      time_indicators: this.extractTimeIndicators(text)
    };
  }

  private async extractSummarizationFeatures(text: string, language: string): Promise<any> {
    return {
      text_content: text,
      language,
      text_length: text.length,
      sentence_count: text.split(/[.!?]+/).length,
      paragraph_count: text.split(/\n\s*\n/).length,
      key_sentences: this.identifyKeySentences(text)
    };
  }

  private async extractPriorityFeatures(text: string, category: string): Promise<any> {
    return {
      text_content: text,
      category,
      urgent_keyword_count: this.countUrgentKeywords(text),
      business_impact_indicators: this.extractBusinessImpactIndicators(text),
      time_sensitivity_indicators: this.extractTimeSensitivityIndicators(text),
      severity_indicators: this.extractSeverityIndicators(text)
    };
  }

  /**
   * Private: Keyword-based classification fallbacks
   */
  private classifyByKeywords(text: string): TicketCategory {
    const keywords = {
      'HVAC': ['temperature', 'hot', 'cold', 'air', 'heating', 'cooling', 'hvac', 'thermostat'],
      'ELECTRICAL': ['power', 'electricity', 'outlet', 'electrical', 'lights', 'lighting', 'bulb'],
      'PLUMBING': ['water', 'leak', 'pipe', 'toilet', 'sink', 'faucet', 'drain', 'plumbing'],
      'CLEANING': ['clean', 'dirty', 'trash', 'garbage', 'janitor', 'custodial', 'spill'],
      'SECURITY': ['security', 'access', 'badge', 'card', 'lock', 'unlock', 'door', 'entry'],
      'IT_SUPPORT': ['computer', 'laptop', 'internet', 'wifi', 'email', 'software', 'printer'],
      'FURNITURE': ['desk', 'chair', 'furniture', 'table', 'cabinet', 'shelf'],
      'SAFETY': ['safety', 'danger', 'hazard', 'emergency', 'fire', 'evacuation'],
      'PARKING': ['parking', 'car', 'vehicle', 'garage', 'lot', 'space']
    };

    const textLower = text.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [category, categoryKeywords] of Object.entries(keywords)) {
      let score = 0;
      for (const keyword of categoryKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (textLower.match(regex) || []).length;
        score += matches;
      }
      scores[category] = score;
    }

    const bestMatch = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
    const category = bestMatch && bestMatch[1] > 0 ? bestMatch[0] : 'OTHER';
    const confidence = bestMatch ? Math.min(0.9, bestMatch[1] * 0.2) : 0.3;

    return { category, confidence };
  }

  private classifyPriorityByHeuristics(text: string): TicketPriority {
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'critical', 'broken', 'not working', 'help'];
    const highKeywords = ['important', 'soon', 'quickly', 'problem', 'issue', 'trouble'];

    const textLower = text.toLowerCase();
    let urgentCount = 0;
    let highCount = 0;

    for (const keyword of urgentKeywords) {
      urgentCount += (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
    }

    for (const keyword of highKeywords) {
      highCount += (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
    }

    if (urgentCount > 0) {
      return {
        level: 'URGENT',
        confidence: Math.min(0.9, urgentCount * 0.3 + 0.6),
        reasoning: `Urgent keywords detected: ${urgentCount} occurrences`
      };
    } else if (highCount > 1) {
      return {
        level: 'HIGH',
        confidence: Math.min(0.8, highCount * 0.2 + 0.5),
        reasoning: 'High priority indicators detected'
      };
    } else if (highCount > 0 || text.includes('?')) {
      return {
        level: 'MEDIUM',
        confidence: 0.6,
        reasoning: 'Standard priority based on content analysis'
      };
    } else {
      return {
        level: 'LOW',
        confidence: 0.7,
        reasoning: 'Low priority - no urgency indicators'
      };
    }
  }

  /**
   * Private: Department routing
   */
  private determineDepartment(category: string, entities: ExtractedEntity[], userDepartment?: string): string {
    const categoryDepartmentMap: Record<string, string> = {
      'HVAC': 'FACILITIES',
      'ELECTRICAL': 'FACILITIES',
      'PLUMBING': 'FACILITIES',
      'CLEANING': 'FACILITIES',
      'SECURITY': 'SECURITY',
      'ACCESS_CONTROL': 'SECURITY',
      'IT_SUPPORT': 'IT',
      'FURNITURE': 'FACILITIES',
      'LIGHTING': 'FACILITIES',
      'SAFETY': 'SAFETY',
      'PARKING': 'FACILITIES',
      'CATERING': 'CATERING'
    };

    // Check if category has a direct mapping
    if (categoryDepartmentMap[category]) {
      return categoryDepartmentMap[category];
    }

    // Check entities for department clues
    const locationEntities = entities.filter(e => e.type === 'LOCATION');
    if (locationEntities.some(e => e.value.toLowerCase().includes('kitchen'))) {
      return 'CATERING';
    }

    // Fallback to user's department if available
    if (userDepartment && userDepartment !== 'GENERAL') {
      return userDepartment;
    }

    return 'FACILITIES'; // Default department
  }

  /**
   * Private: Helper methods for text analysis
   */
  private hasUrgentKeywords(text: string): boolean {
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'critical', 'broken', 'not working'];
    const textLower = text.toLowerCase();
    return urgentKeywords.some(keyword => textLower.includes(keyword));
  }

  private calculateKeywordFrequencies(text: string): Record<string, number> {
    const words = text.toLowerCase().split(/\s+/);
    const frequencies: Record<string, number> = {};
    
    words.forEach(word => {
      word = word.replace(/[^\w]/g, '');
      if (word.length > 2) {
        frequencies[word] = (frequencies[word] || 0) + 1;
      }
    });

    return frequencies;
  }

  private calculateCapsRatio(text: string): number {
    const totalChars = text.replace(/[^a-zA-Z]/g, '').length;
    const capsChars = text.replace(/[^A-Z]/g, '').length;
    return totalChars > 0 ? capsChars / totalChars : 0;
  }

  private countPositiveKeywords(text: string): number {
    const positiveKeywords = ['good', 'great', 'excellent', 'perfect', 'amazing', 'love', 'like', 'happy'];
    const textLower = text.toLowerCase();
    return positiveKeywords.reduce((count, keyword) => {
      return count + (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
    }, 0);
  }

  private countNegativeKeywords(text: string): number {
    const negativeKeywords = ['bad', 'terrible', 'awful', 'hate', 'broken', 'wrong', 'problem', 'issue'];
    const textLower = text.toLowerCase();
    return negativeKeywords.reduce((count, keyword) => {
      return count + (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
    }, 0);
  }

  private extractSentimentIndicators(text: string): any {
    return {
      questionMarks: (text.match(/\?/g) || []).length,
      exclamationMarks: (text.match(/!/g) || []).length,
      capsWords: (text.match(/\b[A-Z]{2,}\b/g) || []).length,
      intensifiers: (text.match(/\b(very|really|extremely|absolutely|totally)\b/gi) || []).length
    };
  }

  private extractEmotionKeywords(text: string): any {
    const emotions = {
      anger: ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
      joy: ['happy', 'glad', 'pleased', 'satisfied', 'delighted'],
      fear: ['worried', 'scared', 'afraid', 'concerned', 'anxious'],
      sadness: ['sad', 'disappointed', 'upset', 'sorry', 'troubled']
    };

    const textLower = text.toLowerCase();
    const emotionCounts: Record<string, number> = {};

    for (const [emotion, keywords] of Object.entries(emotions)) {
      emotionCounts[emotion] = keywords.reduce((count, keyword) => {
        return count + (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
      }, 0);
    }

    return emotionCounts;
  }

  private extractCapitalizedWords(text: string): string[] {
    return (text.match(/\b[A-Z][a-zA-Z]*\b/g) || []).filter(word => word.length > 1);
  }

  private extractLocationIndicators(text: string): string[] {
    const locationKeywords = ['room', 'floor', 'building', 'office', 'desk', 'area', 'zone', 'location'];
    const textLower = text.toLowerCase();
    const indicators: string[] = [];

    locationKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b\\w*${keyword}\\w*\\b`, 'gi');
      const matches = textLower.match(regex) || [];
      indicators.push(...matches);
    });

    return indicators;
  }

  private extractAssetIndicators(text: string): string[] {
    const assetKeywords = ['printer', 'computer', 'monitor', 'phone', 'equipment', 'machine', 'device'];
    const textLower = text.toLowerCase();
    const indicators: string[] = [];

    assetKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b\\w*${keyword}\\w*\\b`, 'gi');
      const matches = textLower.match(regex) || [];
      indicators.push(...matches);
    });

    return indicators;
  }

  private extractTimeIndicators(text: string): string[] {
    const timePatterns = [
      /\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(today|tomorrow|yesterday|now|asap|urgent)\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi
    ];

    const indicators: string[] = [];
    timePatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      indicators.push(...matches);
    });

    return indicators;
  }

  private identifyKeySentences(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Score sentences based on various factors
    const scoredSentences = sentences.map(sentence => ({
      text: sentence.trim(),
      score: this.calculateSentenceScore(sentence)
    }));

    // Return top 3 sentences
    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.text);
  }

  private calculateSentenceScore(sentence: string): number {
    let score = 0;
    
    // Length score (prefer medium length sentences)
    const words = sentence.split(/\s+/).length;
    if (words >= 5 && words <= 20) {score += 2;}
    else if (words > 20) {score += 1;}
    
    // Keyword score
    const importantKeywords = ['problem', 'issue', 'need', 'help', 'urgent', 'broken', 'not working'];
    importantKeywords.forEach(keyword => {
      if (sentence.toLowerCase().includes(keyword)) {score += 3;}
    });
    
    // Position score (first and last sentences are often important)
    // This would be calculated based on sentence position in the full text
    
    return score;
  }

  private countUrgentKeywords(text: string): number {
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'critical', 'immediate', 'broken', 'not working', 'help'];
    const textLower = text.toLowerCase();
    return urgentKeywords.reduce((count, keyword) => {
      return count + (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
    }, 0);
  }

  private extractBusinessImpactIndicators(text: string): any {
    const impactKeywords = {
      high: ['down', 'outage', 'broken', 'not working', 'critical', 'urgent', 'emergency'],
      medium: ['slow', 'problem', 'issue', 'trouble', 'difficulty'],
      low: ['question', 'how', 'can you', 'please', 'request']
    };

    const textLower = text.toLowerCase();
    const impact: Record<string, number> = {};

    for (const [level, keywords] of Object.entries(impactKeywords)) {
      impact[level] = keywords.reduce((count, keyword) => {
        return count + (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
      }, 0);
    }

    return impact;
  }

  private extractTimeSensitivityIndicators(text: string): any {
    const timeKeywords = {
      immediate: ['now', 'immediately', 'asap', 'right away', 'urgent'],
      soon: ['soon', 'quickly', 'today', 'this morning', 'this afternoon'],
      scheduled: ['tomorrow', 'next week', 'when possible', 'sometime', 'eventually']
    };

    const textLower = text.toLowerCase();
    const timing: Record<string, number> = {};

    for (const [timeframe, keywords] of Object.entries(timeKeywords)) {
      timing[timeframe] = keywords.reduce((count, keyword) => {
        return count + (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
      }, 0);
    }

    return timing;
  }

  private extractSeverityIndicators(text: string): any {
    const severityKeywords = {
      critical: ['critical', 'emergency', 'urgent', 'broken', 'down', 'not working'],
      high: ['important', 'problem', 'issue', 'trouble', 'difficulty'],
      medium: ['concern', 'question', 'help', 'support'],
      low: ['request', 'information', 'how to', 'can you']
    };

    const textLower = text.toLowerCase();
    const severity: Record<string, number> = {};

    for (const [level, keywords] of Object.entries(severityKeywords)) {
      severity[level] = keywords.reduce((count, keyword) => {
        return count + (textLower.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
      }, 0);
    }

    return severity;
  }

  private detectUrgencyIndicators(text: string): { isUrgent: boolean; confidence: number; keywords: string[] } {
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'critical', 'immediate', 'now', 'help', 'broken', 'not working'];
    const textLower = text.toLowerCase();
    const foundKeywords: string[] = [];
    
    urgentKeywords.forEach(keyword => {
      if (textLower.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    });

    const isUrgent = foundKeywords.length > 0;
    const confidence = Math.min(0.9, foundKeywords.length * 0.25 + 0.4);

    return { isUrgent, confidence, keywords: foundKeywords };
  }

  /**
   * Private: Advanced NLP methods
   */
  private async extractAspectSentiments(text: string): Promise<any[]> {
    // Simulate aspect-based sentiment analysis
    const aspects = ['service', 'response_time', 'quality', 'staff', 'facility'];
    const aspectSentiments = [];

    for (const aspect of aspects) {
      if (text.toLowerCase().includes(aspect)) {
        aspectSentiments.push({
          aspect,
          sentiment: Math.random() > 0.5 ? 'POSITIVE' : 'NEGATIVE',
          score: (Math.random() - 0.5) * 2,
          confidence: Math.random() * 0.4 + 0.6
        });
      }
    }

    return aspectSentiments;
  }

  private async detectEmotions(text: string): Promise<any[]> {
    // Simulate emotion detection
    const emotions = ['joy', 'anger', 'fear', 'sadness', 'surprise', 'disgust'];
    const detectedEmotions = [];

    emotions.forEach(emotion => {
      const score = Math.random();
      if (score > 0.3) {
        detectedEmotions.push({
          emotion,
          score,
          confidence: Math.random() * 0.3 + 0.7
        });
      }
    });

    return detectedEmotions;
  }

  private async extractCustomEntities(text: string): Promise<ExtractedEntity[]> {
    const customEntities: ExtractedEntity[] = [];
    
    // Extract room numbers (e.g., "Room 123", "Rm 456")
    const roomMatches = text.match(/\b(?:room|rm|office)\s*#?\s*([a-z]?\d+[a-z]?)\b/gi);
    if (roomMatches) {
      roomMatches.forEach(match => {
        const roomNumber = match.replace(/\b(?:room|rm|office)\s*#?\s*/gi, '');
        customEntities.push({
          type: 'LOCATION',
          value: `Room ${roomNumber}`,
          confidence: 0.9,
          startIndex: text.toLowerCase().indexOf(match.toLowerCase()),
          endIndex: text.toLowerCase().indexOf(match.toLowerCase()) + match.length
        });
      });
    }

    // Extract floor numbers
    const floorMatches = text.match(/\b(?:floor|level)\s*#?\s*(\d+)\b/gi);
    if (floorMatches) {
      floorMatches.forEach(match => {
        const floorNumber = match.replace(/\b(?:floor|level)\s*#?\s*/gi, '');
        customEntities.push({
          type: 'LOCATION',
          value: `Floor ${floorNumber}`,
          confidence: 0.85,
          startIndex: text.toLowerCase().indexOf(match.toLowerCase()),
          endIndex: text.toLowerCase().indexOf(match.toLowerCase()) + match.length
        });
      });
    }

    return customEntities;
  }

  private async extractKeywords(text: string): Promise<string[]> {
    // Simple keyword extraction based on frequency and importance
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were']);
    const filteredWords = words.filter(word => !stopWords.has(word));

    const frequency: Record<string, number> = {};
    filteredWords.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Private: Training and utility methods
   */
  private async trainNLPModels(): Promise<void> {
    try {
      const models = [
        { model: this.ticketClassificationModel, name: 'Ticket Classification' },
        { model: this.sentimentAnalysisModel, name: 'Sentiment Analysis' },
        { model: this.entityExtractionModel, name: 'Entity Extraction' },
        { model: this.textSummarizationModel, name: 'Text Summarization' },
        { model: this.priorityClassificationModel, name: 'Priority Classification' }
      ];

      for (const { model, name } of models) {
        if (model) {
          logger.info(`Training ${name} model`);
          const trainingConfig = this.getNLPTrainingConfig(model.type);
          await machineLearningService.trainModel(model.id, trainingConfig);
        }
      }

      logger.info('All NLP models trained successfully');
    } catch (error: unknown) {
      logger.error('Failed to train NLP models', error);
      throw error;
    }
  }

  private getNLPTrainingConfig(modelType: string): any {
    const baseConfig = {
      epochs: 20,
      batchSize: 32,
      validationSplit: 0.2,
      learningRate: 0.0001
    };

    switch (modelType) {
      case 'CLASSIFICATION':
        return {
          ...baseConfig,
          dataSource: 'ticket_classification_dataset',
          algorithm: 'TRANSFORMER_BERT',
          maxSequenceLength: 512
        };
      
      case 'SENTIMENT_ANALYSIS':
        return {
          ...baseConfig,
          dataSource: 'sentiment_analysis_dataset',
          algorithm: 'ROBERTA_FINETUNED',
          aspectBasedSentiment: true
        };
      
      case 'ENTITY_EXTRACTION':
        return {
          ...baseConfig,
          dataSource: 'named_entity_dataset',
          algorithm: 'SPACY_NER_CUSTOM',
          customEntityTypes: ['ROOM', 'BUILDING', 'ASSET', 'ISSUE_TYPE']
        };
      
      default:
        return baseConfig;
    }
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>();
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      if (seen.has(key)) {return false;}
      seen.add(key);
      return true;
    });
  }

  private calculateOverallConfidence(
    categoryResult: TicketCategory,
    priorityResult: TicketPriority,
    entities: ExtractedEntity[]
  ): number {
    const categoryWeight = 0.4;
    const priorityWeight = 0.3;
    const entityWeight = 0.3;

    const categoryConfidence = categoryResult.confidence;
    const priorityConfidence = priorityResult.confidence;
    const entityConfidence = entities.length > 0 
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length 
      : 0.5;

    return (
      categoryConfidence * categoryWeight +
      priorityConfidence * priorityWeight +
      entityConfidence * entityWeight
    );
  }

  private async suggestAssignee(classification: TicketClassification): Promise<string | undefined> {
    // Simple assignee suggestion based on category and department
    const assignees: Record<string, string[]> = {
      'FACILITIES': ['facilities.manager@company.com', 'maintenance.tech@company.com'],
      'IT': ['it.support@company.com', 'help.desk@company.com'],
      'SECURITY': ['security@company.com', 'access.control@company.com'],
      'CATERING': ['catering@company.com', 'kitchen.manager@company.com']
    };

    const departmentAssignees = assignees[classification.predictedDepartment];
    if (departmentAssignees && departmentAssignees.length > 0) {
      // Return first assignee for now - could be enhanced with workload balancing
      return departmentAssignees[0];
    }

    return undefined;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const nlpService = new NLPService();