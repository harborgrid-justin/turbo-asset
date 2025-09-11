import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { machineLearningService } from './MachineLearningService';
import { nlpService } from './NLPService';
import {
  SentimentAnalysisModel,
  EmployeeFeedbackAnalysis,
  DetailedSentiment,
  SentimentPolarity,
  AspectSentiment,
  ExtractedTopic,
  EmotionScore,
  ActionItem,
  SentimentTrends,
  DateRange,
  TrendDirection,
  CategoryTrend,
  SentimentInsight,
  SentimentRecommendation,
  MLModel
} from '../../types/machinelearning';

/**
 * SentimentAnalysisService - Advanced sentiment analysis from employee feedback and surveys
 * Analyzes employee feedback, surveys, and communications to provide insights into workplace satisfaction
 */
export class SentimentAnalysisService extends EventEmitter {
  private workplaceSentimentModel?: MLModel;
  private facilitiesSentimentModel?: MLModel;
  private emotionAnalysisModel?: MLModel;
  private topicExtractionModel?: MLModel;
  private trendAnalysisModel?: MLModel;

  private readonly feedbackBuffer: Map<string, EmployeeFeedbackAnalysis[]> = new Map();
  private readonly sentimentCache: Map<string, any> = new Map();
  private readonly maxBufferSize = 5000;

  // Sentiment analysis configuration
  private readonly supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt'];
  private readonly confidenceThreshold = 0.6;
  private readonly batchSize = 100;

  constructor() {
    super();
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      logger.info('Initializing Sentiment Analysis Service');

      // Initialize workplace sentiment model
      this.workplaceSentimentModel = await machineLearningService.registerModel(
        'Workplace Sentiment Analyzer',
        'NLP',
        {
          algorithm: 'ROBERTA_WORKPLACE_FINETUNED',
          domain: 'WORKPLACE',
          language: 'multi',
          sentimentClasses: ['VERY_POSITIVE', 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'VERY_NEGATIVE'],
          aspectBasedSentiment: true,
          contextAwareness: true,
          features: [
            'text_content',
            'context_type',
            'employee_role',
            'department',
            'feedback_channel',
            'temporal_context',
            'workplace_aspects',
            'emotional_indicators'
          ]
        },
        {
          trainingDataSize: 750000,
          features: [
            'text_content',
            'context_type',
            'employee_role',
            'department',
            'feedback_channel',
            'temporal_context',
            'workplace_aspects',
            'emotional_indicators'
          ],
          target: 'sentiment_classification',
          algorithm: 'ROBERTA_WORKPLACE_FINETUNED'
        }
      );

      // Initialize facilities sentiment model
      this.facilitiesSentimentModel = await machineLearningService.registerModel(
        'Facilities Sentiment Analyzer',
        'NLP',
        {
          algorithm: 'BERT_FACILITIES_SPECIALIZED',
          domain: 'FACILITIES',
          facilityAspects: [
            'WORKSPACE', 'AMENITIES', 'TECHNOLOGY', 'ENVIRONMENT', 
            'COMFORT', 'ACCESSIBILITY', 'CLEANLINESS', 'SAFETY',
            'TEMPERATURE', 'LIGHTING', 'NOISE', 'FURNITURE'
          ],
          sentimentGranularity: 'ASPECT_LEVEL',
          features: [
            'feedback_text',
            'facility_aspect',
            'location_context',
            'issue_severity',
            'temporal_patterns',
            'comparative_context'
          ]
        }
      );

      // Initialize emotion analysis model
      this.emotionAnalysisModel = await machineLearningService.registerModel(
        'Emotion Detector',
        'NLP',
        {
          algorithm: 'TRANSFORMER_EMOTION_CLASSIFIER',
          emotions: ['JOY', 'ANGER', 'FEAR', 'SADNESS', 'SURPRISE', 'DISGUST', 'TRUST', 'ANTICIPATION'],
          emotionIntensity: true,
          multiLabelClassification: true,
          features: [
            'text_content',
            'linguistic_features',
            'emotional_keywords',
            'context_markers',
            'intensity_indicators'
          ]
        }
      );

      // Initialize topic extraction model
      this.topicExtractionModel = await machineLearningService.registerModel(
        'Topic Extractor',
        'NLP',
        {
          algorithm: 'LATENT_DIRICHLET_ALLOCATION_NEURAL',
          topicCategories: [
            'WORKSPACE', 'AMENITIES', 'TECHNOLOGY', 'ENVIRONMENT', 'MANAGEMENT',
            'COMMUNICATION', 'WORK_LIFE_BALANCE', 'CAREER_DEVELOPMENT', 'BENEFITS',
            'COLLABORATION', 'CULTURE', 'PROCESSES', 'TOOLS', 'POLICIES'
          ],
          dynamicTopicDiscovery: true,
          topicCoherence: true,
          features: [
            'text_content',
            'keyword_extraction',
            'semantic_embeddings',
            'contextual_clues',
            'domain_knowledge'
          ]
        }
      );

      // Initialize trend analysis model
      this.trendAnalysisModel = await machineLearningService.registerModel(
        'Sentiment Trend Analyzer',
        'TIME_SERIES',
        {
          algorithm: 'LSTM_ATTENTION_TREND',
          trendComponents: ['SHORT_TERM', 'LONG_TERM', 'SEASONAL', 'CYCLICAL'],
          changePointDetection: true,
          forecastingCapability: true,
          features: [
            'historical_sentiment_scores',
            'temporal_patterns',
            'external_events',
            'organizational_changes',
            'seasonal_factors',
            'business_cycles'
          ]
        }
      );

      // Train all models
      await this.trainSentimentModels();

      // Start background processing
      this.startBackgroundProcessing();

      logger.info('Sentiment Analysis Service initialized successfully');
      this.emit('service:initialized');

    } catch (error) {
      logger.error('Failed to initialize Sentiment Analysis Service', error);
      throw error;
    }
  }

  /**
   * Analyze employee feedback with comprehensive sentiment analysis
   */
  async analyzeFeedback(
    feedbackId: string,
    content: string,
    source: 'SURVEY' | 'REVIEW' | 'COMMENT' | 'TICKET',
    options: {
      language?: string;
      includeEmotions?: boolean;
      includeTopics?: boolean;
      includeActionItems?: boolean;
      employeeContext?: {
        role?: string;
        department?: string;
        tenure?: number;
        location?: string;
      };
    } = {}
  ): Promise<EmployeeFeedbackAnalysis> {
    try {
      const {
        language = 'en',
        includeEmotions = true,
        includeTopics = true,
        includeActionItems = true,
        employeeContext = {}
      } = options;

      logger.info('Analyzing employee feedback', {
        feedbackId,
        source,
        contentLength: content.length,
        language,
        includeEmotions,
        includeTopics
      });

      // Validate language support
      if (!this.supportedLanguages.includes(language)) {
        logger.warn(`Language ${language} not fully supported, using English model`);
      }

      // Perform detailed sentiment analysis
      const detailedSentiment = await this.performDetailedSentimentAnalysis(
        content,
        source,
        language,
        employeeContext
      );

      // Extract topics if requested
      let topics: ExtractedTopic[] = [];
      if (includeTopics) {
        topics = await this.extractTopics(content, language);
      }

      // Analyze emotions if requested
      let emotions: EmotionScore[] = [];
      if (includeEmotions) {
        emotions = await this.analyzeEmotions(content, language);
      }

      // Generate action items if requested
      let actionItems: ActionItem[] = [];
      if (includeActionItems) {
        actionItems = await this.generateActionItems(
          content,
          detailedSentiment,
          topics,
          source
        );
      }

      const analysis: EmployeeFeedbackAnalysis = {
        feedbackId,
        source,
        content,
        sentiment: detailedSentiment,
        topics,
        emotions,
        actionItems,
        timestamp: new Date(),
        language,
        confidence: this.calculateOverallConfidence(detailedSentiment, topics, emotions),
        ...(Object.keys(employeeContext).length > 0 && { employeeContext })
      };

      // Store analysis for trend tracking
      this.storeFeedbackAnalysis(analysis);

      // Emit analysis completed event
      this.emit('feedback:analyzed', {
        feedbackId,
        source,
        sentiment: detailedSentiment.overall.label,
        score: detailedSentiment.overall.score,
        topicsCount: topics.length,
        actionItemsCount: actionItems.length,
        confidence: analysis.confidence
      });

      logger.info('Feedback analysis completed', {
        feedbackId,
        sentiment: detailedSentiment.overall.label,
        confidence: analysis.confidence,
        topicsFound: topics.length,
        actionItems: actionItems.length
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to analyze feedback', { feedbackId, error });
      throw error;
    }
  }

  /**
   * Analyze sentiment trends over time
   */
  async analyzeSentimentTrends(
    organizationId: string,
    period: DateRange,
    options: {
      groupBy?: 'DEPARTMENT' | 'LOCATION' | 'ROLE' | 'SOURCE';
      includeComparisons?: boolean;
      includeForecasting?: boolean;
      includeInsights?: boolean;
      includeRecommendations?: boolean;
      categories?: string[];
    } = {}
  ): Promise<SentimentTrends> {
    try {
      const {
        groupBy,
        includeComparisons = true,
        includeForecasting = false,
        includeInsights = true,
        includeRecommendations = true,
        categories = []
      } = options;

      logger.info('Analyzing sentiment trends', {
        organizationId,
        period,
        groupBy,
        includeComparisons,
        includeForecasting
      });

      // Get feedback data for the period
      const feedbackData = await this.getFeedbackForPeriod(organizationId, period);

      if (feedbackData.length === 0) {
        logger.warn('No feedback data found for the specified period', { organizationId, period });
        return this.createEmptyTrends(organizationId, period);
      }

      // Calculate overall trend
      const overallTrend = this.calculateOverallTrend(feedbackData);

      // Calculate category trends
      const categoryTrends = await this.calculateCategoryTrends(
        feedbackData,
        groupBy,
        categories
      );

      // Generate insights if requested
      let insights: SentimentInsight[] = [];
      if (includeInsights) {
        insights = await this.generateSentimentInsights(
          feedbackData,
          overallTrend,
          categoryTrends
        );
      }

      // Generate recommendations if requested
      let recommendations: SentimentRecommendation[] = [];
      if (includeRecommendations) {
        recommendations = await this.generateSentimentRecommendations(
          insights,
          categoryTrends,
          organizationId
        );
      }

      // Add forecasting if requested
      let forecast = null;
      if (includeForecasting) {
        forecast = await this.forecastSentimentTrends(
          feedbackData,
          overallTrend,
          30 // 30-day forecast
        );
      }

      const trends: SentimentTrends = {
        organizationId,
        period,
        overallTrend,
        categoryTrends,
        insights,
        recommendations,
        metadata: {
          totalFeedback: feedbackData.length,
          analysisDate: new Date(),
          groupBy,
          ...(forecast && { forecast })
        }
      };

      logger.info('Sentiment trends analysis completed', {
        organizationId,
        overallTrend,
        categoryTrendsCount: categoryTrends.length,
        insightsCount: insights.length,
        recommendationsCount: recommendations.length
      });

      this.emit('trends:analyzed', {
        organizationId,
        period,
        overallTrend,
        significantChanges: insights.filter(i => i.confidence > 0.8).length
      });

      return trends;

    } catch (error) {
      logger.error('Failed to analyze sentiment trends', { organizationId, error });
      throw error;
    }
  }

  /**
   * Batch process multiple feedback items
   */
  async batchAnalyzeFeedback(
    feedbackItems: Array<{
      feedbackId: string;
      content: string;
      source: 'SURVEY' | 'REVIEW' | 'COMMENT' | 'TICKET';
      language?: string;
      employeeContext?: any;
    }>,
    options: {
      maxConcurrency?: number;
      includeEmotions?: boolean;
      includeTopics?: boolean;
      includeActionItems?: boolean;
      generateSummary?: boolean;
    } = {}
  ): Promise<{
    analyses: EmployeeFeedbackAnalysis[];
    summary: any;
    errors: any[];
  }> {
    try {
      const {
        maxConcurrency = this.batchSize,
        includeEmotions = true,
        includeTopics = true,
        includeActionItems = false, // Disabled for batch processing
        generateSummary = true
      } = options;

      logger.info('Starting batch feedback analysis', {
        itemsCount: feedbackItems.length,
        maxConcurrency,
        includeEmotions,
        includeTopics
      });

      const results: EmployeeFeedbackAnalysis[] = [];
      const errors: any[] = [];
      const startTime = Date.now();

      // Process in batches to avoid overwhelming the system
      const batches = this.chunkArray(feedbackItems, maxConcurrency);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`, {
          batchSize: batch.length
        });

        // Process batch items in parallel
        const batchPromises = batch.map(async (item) => {
          try {
            const analysis = await this.analyzeFeedback(
              item.feedbackId,
              item.content,
              item.source,
              {
                language: item.language,
                includeEmotions,
                includeTopics,
                includeActionItems,
                employeeContext: item.employeeContext
              }
            );
            return { success: true, analysis };
          } catch (error) {
            return {
              success: false,
              error: {
                feedbackId: item.feedbackId,
                error: error.message
              }
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);

        // Separate successful results from errors
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result.analysis);
          } else {
            errors.push(result.error);
          }
        });

        // Emit progress update
        this.emit('batch:progress', {
          completed: (batchIndex + 1) * maxConcurrency,
          total: feedbackItems.length,
          successCount: results.length,
          errorCount: errors.length
        });
      }

      const processingTime = Date.now() - startTime;

      // Generate summary if requested
      let summary = null;
      if (generateSummary && results.length > 0) {
        summary = await this.generateBatchSummary(results, processingTime);
      }

      logger.info('Batch feedback analysis completed', {
        totalItems: feedbackItems.length,
        successfulAnalyses: results.length,
        errors: errors.length,
        processingTime,
        averageTimePerItem: processingTime / feedbackItems.length
      });

      this.emit('batch:completed', {
        totalItems: feedbackItems.length,
        successCount: results.length,
        errorCount: errors.length,
        processingTime,
        summary
      });

      return {
        analyses: results,
        summary,
        errors
      };

    } catch (error) {
      logger.error('Failed to batch analyze feedback', { error });
      throw error;
    }
  }

  /**
   * Get sentiment dashboard with real-time metrics
   */
  async getSentimentDashboard(
    organizationId: string,
    options: {
      timeRange?: DateRange;
      includeRealTime?: boolean;
      includeTrends?: boolean;
      includeBreakdowns?: boolean;
      includeAlerts?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const {
        timeRange = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        },
        includeRealTime = true,
        includeTrends = true,
        includeBreakdowns = true,
        includeAlerts = true
      } = options;

      logger.info('Generating sentiment dashboard', {
        organizationId,
        timeRange,
        includeRealTime,
        includeTrends
      });

      // Get feedback data for the time range
      const feedbackData = await this.getFeedbackForPeriod(organizationId, timeRange);

      // Calculate overall metrics
      const overallMetrics = this.calculateOverallMetrics(feedbackData);

      // Get real-time metrics if requested
      let realTimeMetrics = null;
      if (includeRealTime) {
        realTimeMetrics = await this.getRealTimeMetrics(organizationId);
      }

      // Calculate trends if requested
      let trends = null;
      if (includeTrends) {
        trends = await this.calculateDashboardTrends(feedbackData, timeRange);
      }

      // Generate breakdowns if requested
      let breakdowns = null;
      if (includeBreakdowns) {
        breakdowns = await this.generateSentimentBreakdowns(feedbackData);
      }

      // Get alerts if requested
      let alerts = null;
      if (includeAlerts) {
        alerts = await this.getSentimentAlerts(organizationId, feedbackData);
      }

      const dashboard = {
        organizationId,
        timeRange,
        overallMetrics,
        realTimeMetrics,
        trends,
        breakdowns,
        alerts,
        topInsights: this.getTopInsights(feedbackData),
        actionItems: await this.getPriorityActionItems(organizationId, feedbackData),
        generatedAt: new Date()
      };

      logger.info('Sentiment dashboard generated', {
        organizationId,
        feedbackAnalyzed: feedbackData.length,
        overallSentiment: overallMetrics.averageSentiment,
        trendsCalculated: trends !== null,
        alertsFound: alerts?.length || 0
      });

      return dashboard;

    } catch (error) {
      logger.error('Failed to generate sentiment dashboard', { organizationId, error });
      throw error;
    }
  }

  /**
   * Private: Core analysis methods
   */
  private async performDetailedSentimentAnalysis(
    content: string,
    source: string,
    language: string,
    employeeContext: any
  ): Promise<DetailedSentiment> {
    // Use workplace sentiment model if available, otherwise fallback to NLP service
    if (this.workplaceSentimentModel) {
      return this.performMLSentimentAnalysis(content, source, language, employeeContext);
    } else {
      return this.performBasicSentimentAnalysis(content, language);
    }
  }

  private async performMLSentimentAnalysis(
    content: string,
    source: string,
    language: string,
    employeeContext: any
  ): Promise<DetailedSentiment> {
    try {
      const features = {
        text_content: content,
        context_type: source,
        language,
        employee_role: employeeContext.role || 'UNKNOWN',
        department: employeeContext.department || 'GENERAL',
        feedback_channel: source,
        text_length: content.length,
        word_count: content.split(/\s+/).length
      };

      const prediction = await machineLearningService.predict(
        this.workplaceSentimentModel!.id,
        features,
        { includeConfidence: true }
      );

      // Extract overall sentiment
      const overallSentiment = this.extractOverallSentiment(prediction.prediction);

      // Extract aspect-based sentiments
      const aspectSentiments = await this.extractAspectSentiments(
        content,
        prediction.prediction,
        language
      );

      return {
        overall: overallSentiment,
        aspects: aspectSentiments,
        intensity: prediction.prediction.intensity || this.calculateIntensity(overallSentiment.score),
        confidence: prediction.confidence
      };

    } catch (error) {
      logger.warn('ML sentiment analysis failed, using fallback', error);
      return this.performBasicSentimentAnalysis(content, language);
    }
  }

  private async performBasicSentimentAnalysis(content: string, language: string): Promise<DetailedSentiment> {
    // Use NLP service for basic sentiment analysis
    const sentimentResult = await nlpService.analyzeSentiment(content, language, {
      includeAspects: true,
      includeEmotions: false
    });

    const overallSentiment: SentimentPolarity = {
      label: sentimentResult.overall > 0.1 ? 'POSITIVE' : 
             sentimentResult.overall < -0.1 ? 'NEGATIVE' : 'NEUTRAL',
      score: sentimentResult.overall
    };

    const aspectSentiments: AspectSentiment[] = sentimentResult.aspects?.map((aspect: any) => ({
      aspect: aspect.aspect,
      sentiment: {
        label: aspect.sentiment.label,
        score: aspect.sentiment.score
      },
      mentions: aspect.mentions || []
    })) || [];

    return {
      overall: overallSentiment,
      aspects: aspectSentiments,
      intensity: Math.abs(sentimentResult.overall),
      confidence: sentimentResult.confidence
    };
  }

  private async extractTopics(content: string, language: string): Promise<ExtractedTopic[]> {
    try {
      if (!this.topicExtractionModel) {
        return this.extractBasicTopics(content);
      }

      const features = {
        text_content: content,
        language,
        content_length: content.length
      };

      const prediction = await machineLearningService.predict(
        this.topicExtractionModel.id,
        features,
        { includeConfidence: true }
      );

      return this.processTopicPrediction(prediction.prediction, content);

    } catch (error) {
      logger.warn('Topic extraction failed, using fallback', error);
      return this.extractBasicTopics(content);
    }
  }

  private extractBasicTopics(content: string): ExtractedTopic[] {
    const topicKeywords = {
      'WORKSPACE': ['desk', 'office', 'workspace', 'seating', 'chair', 'table'],
      'AMENITIES': ['kitchen', 'coffee', 'gym', 'cafeteria', 'parking', 'amenity'],
      'TECHNOLOGY': ['wifi', 'computer', 'software', 'IT', 'tech', 'system'],
      'ENVIRONMENT': ['noise', 'temperature', 'lighting', 'air', 'comfort', 'clean'],
      'MANAGEMENT': ['manager', 'supervisor', 'leadership', 'communication', 'meeting']
    };

    const topics: ExtractedTopic[] = [];
    const contentLower = content.toLowerCase();

    for (const [category, keywords] of Object.entries(topicKeywords)) {
      const matches = keywords.filter(keyword => contentLower.includes(keyword));
      if (matches.length > 0) {
        topics.push({
          topic: category.toLowerCase().replace('_', ' '),
          relevance: matches.length / keywords.length,
          keywords: matches,
          category: category as any
        });
      }
    }

    return topics.sort((a, b) => b.relevance - a.relevance);
  }

  private async analyzeEmotions(content: string, language: string): Promise<EmotionScore[]> {
    try {
      if (!this.emotionAnalysisModel) {
        return this.extractBasicEmotions(content);
      }

      const features = {
        text_content: content,
        language,
        emotional_keywords: this.countEmotionalKeywords(content)
      };

      const prediction = await machineLearningService.predict(
        this.emotionAnalysisModel.id,
        features,
        { includeConfidence: true }
      );

      return this.processEmotionPrediction(prediction.prediction);

    } catch (error) {
      logger.warn('Emotion analysis failed, using fallback', error);
      return this.extractBasicEmotions(content);
    }
  }

  private extractBasicEmotions(content: string): EmotionScore[] {
    const emotionKeywords = {
      'JOY': ['happy', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love'],
      'ANGER': ['angry', 'frustrated', 'annoyed', 'upset', 'mad', 'furious'],
      'FEAR': ['worried', 'concerned', 'afraid', 'anxious', 'nervous'],
      'SADNESS': ['sad', 'disappointed', 'unhappy', 'depressed'],
      'SURPRISE': ['surprised', 'unexpected', 'shocked', 'amazed'],
      'DISGUST': ['disgusting', 'awful', 'terrible', 'horrible']
    };

    const emotions: EmotionScore[] = [];
    const contentLower = content.toLowerCase();

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(keyword => contentLower.includes(keyword));
      if (matches.length > 0) {
        emotions.push({
          emotion: emotion as any,
          score: matches.length / keywords.length
        });
      }
    }

    return emotions.sort((a, b) => b.score - a.score);
  }

  private async generateActionItems(
    content: string,
    sentiment: DetailedSentiment,
    topics: ExtractedTopic[],
    source: string
  ): Promise<ActionItem[]> {
    const actionItems: ActionItem[] = [];

    // Generate action items based on negative sentiment
    if (sentiment.overall.label === 'NEGATIVE' && sentiment.confidence > this.confidenceThreshold) {
      actionItems.push({
        priority: sentiment.intensity > 0.7 ? 'HIGH' : 'MEDIUM',
        category: 'SENTIMENT_IMPROVEMENT',
        description: 'Address negative sentiment expressed in feedback',
        suggestedAction: this.suggestSentimentImprovement(content, topics),
        estimatedImpact: sentiment.intensity * 10
      });
    }

    // Generate topic-specific action items
    for (const topic of topics) {
      if (topic.relevance > 0.5) {
        const topicSentiment = sentiment.aspects.find(aspect => 
          aspect.aspect.toLowerCase().includes(topic.topic.toLowerCase())
        );

        if (topicSentiment && topicSentiment.sentiment.label === 'NEGATIVE') {
          actionItems.push({
            priority: topicSentiment.sentiment.score < -0.5 ? 'HIGH' : 'MEDIUM',
            category: topic.category,
            description: `Address concerns related to ${topic.topic}`,
            suggestedAction: this.suggestTopicImprovement(topic, content),
            estimatedImpact: Math.abs(topicSentiment.sentiment.score) * 8
          });
        }
      }
    }

    return actionItems.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Private: Trend analysis methods
   */
  private calculateOverallTrend(feedbackData: EmployeeFeedbackAnalysis[]): TrendDirection {
    if (feedbackData.length < 2) {return 'STABLE';}

    // Sort by timestamp
    const sorted = feedbackData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate moving averages for trend detection
    const windowSize = Math.min(7, Math.floor(sorted.length / 4));
    if (windowSize < 2) {return 'STABLE';}

    const recentAvg = this.calculateMovingAverage(
      sorted.slice(-windowSize).map(f => f.sentiment.overall.score)
    );
    
    const earlierAvg = this.calculateMovingAverage(
      sorted.slice(0, windowSize).map(f => f.sentiment.overall.score)
    );

    const change = (recentAvg - earlierAvg) / Math.abs(earlierAvg);
    
    if (change > 0.1) {return 'IMPROVING';}
    if (change < -0.1) {return 'DECLINING';}
    if (Math.abs(change) > 0.2) {return 'VOLATILE';}
    return 'STABLE';
  }

  private async calculateCategoryTrends(
    feedbackData: EmployeeFeedbackAnalysis[],
    groupBy?: string,
    categories: string[] = []
  ): Promise<CategoryTrend[]> {
    const trends: CategoryTrend[] = [];

    if (groupBy) {
      // Group by specified dimension
      const grouped = this.groupFeedbackBy(feedbackData, groupBy);
      
      for (const [category, items] of Object.entries(grouped)) {
        if (categories.length === 0 || categories.includes(category)) {
          const trend = this.calculateOverallTrend(items);
          const change = this.calculateSentimentChange(items);
          
          trends.push({
            category,
            trend,
            change,
            significance: this.calculateSignificance(items)
          });
        }
      }
    } else {
      // Use topic-based categories
      const topicTrends = this.calculateTopicTrends(feedbackData);
      trends.push(...topicTrends);
    }

    return trends.sort((a, b) => b.significance - a.significance);
  }

  private calculateTopicTrends(feedbackData: EmployeeFeedbackAnalysis[]): CategoryTrend[] {
    const topicGroups: Record<string, EmployeeFeedbackAnalysis[]> = {};

    // Group feedback by dominant topic
    feedbackData.forEach(feedback => {
      const dominantTopic = feedback.topics.reduce((max, topic) => 
        topic.relevance > max.relevance ? topic : max, 
        feedback.topics[0] || { topic: 'general', relevance: 0, keywords: [], category: 'GENERAL' }
      );
      
      const category = dominantTopic.category;
      if (!topicGroups[category]) {
        topicGroups[category] = [];
      }
      topicGroups[category].push(feedback);
    });

    return Object.entries(topicGroups).map(([category, items]) => ({
      category,
      trend: this.calculateOverallTrend(items),
      change: this.calculateSentimentChange(items),
      significance: this.calculateSignificance(items)
    }));
  }

  private calculateSentimentChange(feedbackItems: EmployeeFeedbackAnalysis[]): number {
    if (feedbackItems.length < 2) {return 0;}

    const sorted = feedbackItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const midPoint = Math.floor(sorted.length / 2);
    
    const earlierAvg = this.calculateAverageSentiment(sorted.slice(0, midPoint));
    const laterAvg = this.calculateAverageSentiment(sorted.slice(midPoint));
    
    return laterAvg - earlierAvg;
  }

  private calculateSignificance(feedbackItems: EmployeeFeedbackAnalysis[]): number {
    // Significance based on volume, confidence, and sentiment spread
    const volume = feedbackItems.length;
    const avgConfidence = feedbackItems.reduce((sum, f) => sum + f.confidence, 0) / volume;
    const sentimentVariation = this.calculateVariation(
      feedbackItems.map(f => f.sentiment.overall.score)
    );
    
    return Math.min(1, (volume / 10) * avgConfidence * (1 - sentimentVariation));
  }

  /**
   * Private: Insights and recommendations
   */
  private async generateSentimentInsights(
    feedbackData: EmployeeFeedbackAnalysis[],
    overallTrend: TrendDirection,
    categoryTrends: CategoryTrend[]
  ): Promise<SentimentInsight[]> {
    const insights: SentimentInsight[] = [];

    // Overall trend insights
    if (overallTrend === 'DECLINING') {
      insights.push({
        type: 'NEGATIVE_DRIVER',
        description: 'Overall employee sentiment is declining',
        confidence: 0.9,
        impact: 0.8
      });
    } else if (overallTrend === 'IMPROVING') {
      insights.push({
        type: 'POSITIVE_DRIVER',
        description: 'Overall employee sentiment is improving',
        confidence: 0.9,
        impact: 0.7
      });
    }

    // Category-specific insights
    const decliningCategories = categoryTrends.filter(c => c.trend === 'DECLINING' && c.significance > 0.6);
    const improvingCategories = categoryTrends.filter(c => c.trend === 'IMPROVING' && c.significance > 0.6);

    if (decliningCategories.length > 0) {
      insights.push({
        type: 'RISK',
        description: `Declining sentiment in key areas: ${decliningCategories.map(c => c.category).join(', ')}`,
        confidence: 0.8,
        impact: 0.9
      });
    }

    if (improvingCategories.length > 0) {
      insights.push({
        type: 'OPPORTUNITY',
        description: `Positive momentum in: ${improvingCategories.map(c => c.category).join(', ')}`,
        confidence: 0.8,
        impact: 0.6
      });
    }

    // Topic-based insights
    const topicInsights = this.generateTopicInsights(feedbackData);
    insights.push(...topicInsights);

    return insights.sort((a, b) => (b.confidence * b.impact) - (a.confidence * a.impact));
  }

  private generateTopicInsights(feedbackData: EmployeeFeedbackAnalysis[]): SentimentInsight[] {
    const insights: SentimentInsight[] = [];
    const topicCounts: Record<string, { count: number; avgSentiment: number }> = {};

    // Aggregate topic data
    feedbackData.forEach(feedback => {
      feedback.topics.forEach(topic => {
        if (!topicCounts[topic.topic]) {
          topicCounts[topic.topic] = { count: 0, avgSentiment: 0 };
        }
        topicCounts[topic.topic].count++;
        topicCounts[topic.topic].avgSentiment += feedback.sentiment.overall.score;
      });
    });

    // Calculate averages and generate insights
    Object.entries(topicCounts).forEach(([topic, data]) => {
      if (data.count >= 3) { // Only consider topics with at least 3 mentions
        const avgSentiment = data.avgSentiment / data.count;
        
        if (avgSentiment < -0.3) {
          insights.push({
            type: 'NEGATIVE_DRIVER',
            description: `Negative sentiment around ${topic} (${data.count} mentions)`,
            confidence: Math.min(0.95, data.count / 10),
            impact: Math.abs(avgSentiment)
          });
        } else if (avgSentiment > 0.3) {
          insights.push({
            type: 'POSITIVE_DRIVER',
            description: `Positive sentiment around ${topic} (${data.count} mentions)`,
            confidence: Math.min(0.95, data.count / 10),
            impact: avgSentiment
          });
        }
      }
    });

    return insights;
  }

  private async generateSentimentRecommendations(
    insights: SentimentInsight[],
    categoryTrends: CategoryTrend[],
    organizationId: string
  ): Promise<SentimentRecommendation[]> {
    const recommendations: SentimentRecommendation[] = [];

    // Recommendations based on insights
    const negativeDrivers = insights.filter(i => i.type === 'NEGATIVE_DRIVER' && i.confidence > 0.7);
    const risks = insights.filter(i => i.type === 'RISK' && i.confidence > 0.7);

    for (const driver of negativeDrivers) {
      recommendations.push({
        priority: driver.impact > 0.7 ? 'HIGH' : 'MEDIUM',
        area: this.extractAreaFromDescription(driver.description),
        action: this.generateRecommendationAction(driver),
        expectedImprovement: driver.impact * 50, // Percentage improvement
        timeline: driver.priority === 'HIGH' ? '2-4 weeks' : '1-3 months',
        resources: this.identifyRequiredResources(driver)
      });
    }

    for (const risk of risks) {
      recommendations.push({
        priority: 'HIGH',
        area: this.extractAreaFromDescription(risk.description),
        action: 'Immediate attention required to prevent further deterioration',
        expectedImprovement: risk.impact * 60,
        timeline: '1-2 weeks',
        resources: ['Management attention', 'Employee survey', 'Action planning session']
      });
    }

    // Category-specific recommendations
    const decliningCategories = categoryTrends.filter(c => c.trend === 'DECLINING' && c.significance > 0.5);
    
    for (const category of decliningCategories) {
      recommendations.push({
        priority: Math.abs(category.change) > 0.5 ? 'HIGH' : 'MEDIUM',
        area: category.category,
        action: this.generateCategoryRecommendation(category.category),
        expectedImprovement: Math.abs(category.change) * 40,
        timeline: '4-8 weeks',
        resources: this.getCategoryResources(category.category)
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Private: Model training and utilities
   */
  private async trainSentimentModels(): Promise<void> {
    try {
      const models = [
        { model: this.workplaceSentimentModel, name: 'Workplace Sentiment' },
        { model: this.facilitiesSentimentModel, name: 'Facilities Sentiment' },
        { model: this.emotionAnalysisModel, name: 'Emotion Analysis' },
        { model: this.topicExtractionModel, name: 'Topic Extraction' },
        { model: this.trendAnalysisModel, name: 'Trend Analysis' }
      ];

      for (const { model, name } of models) {
        if (model) {
          logger.info(`Training ${name} model`);
          const trainingConfig = this.getSentimentTrainingConfig(model.type);
          await machineLearningService.trainModel(model.id, trainingConfig);
        }
      }

      logger.info('All sentiment analysis models trained successfully');
    } catch (error) {
      logger.error('Failed to train sentiment models', error);
      throw error;
    }
  }

  private getSentimentTrainingConfig(modelType: string): any {
    const baseConfig = {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      learningRate: 0.00002 // Lower learning rate for fine-tuning
    };

    switch (modelType) {
      case 'NLP':
        return {
          ...baseConfig,
          dataSource: 'workplace_sentiment_dataset',
          algorithm: 'ROBERTA_WORKPLACE_FINETUNED',
          features: [
            'text_content',
            'context_type',
            'workplace_aspects'
          ]
        };
      
      case 'TIME_SERIES':
        return {
          ...baseConfig,
          dataSource: 'sentiment_trends_dataset',
          algorithm: 'LSTM_ATTENTION_TREND',
          features: [
            'historical_sentiment_scores',
            'temporal_patterns',
            'external_events'
          ]
        };
      
      default:
        return baseConfig;
    }
  }

  private startBackgroundProcessing(): void {
    // Process buffered feedback periodically
    setInterval(() => {
      this.processFeedbackBuffer();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Cleanup old cache entries
    setInterval(() => {
      this.cleanupCache();
    }, 60 * 60 * 1000); // Every hour
  }

  private processFeedbackBuffer(): void {
    // Process any buffered feedback for trend analysis
    logger.debug('Processing feedback buffer', {
      bufferSize: Array.from(this.feedbackBuffer.values()).reduce((sum, arr) => sum + arr.length, 0)
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, cached] of this.sentimentCache) {
      if (now - cached.timestamp > maxAge) {
        this.sentimentCache.delete(key);
      }
    }
  }

  // Additional helper methods
  private storeFeedbackAnalysis(analysis: EmployeeFeedbackAnalysis): void {
    const orgId = 'default'; // Would extract from analysis context
    if (!this.feedbackBuffer.has(orgId)) {
      this.feedbackBuffer.set(orgId, []);
    }
    
    const buffer = this.feedbackBuffer.get(orgId)!;
    buffer.push(analysis);
    
    // Maintain buffer size
    if (buffer.length > this.maxBufferSize) {
      buffer.splice(0, buffer.length - this.maxBufferSize);
    }
  }

  private calculateOverallConfidence(sentiment: DetailedSentiment, topics: ExtractedTopic[], emotions: EmotionScore[]): number {
    const sentimentWeight = 0.5;
    const topicsWeight = 0.3;
    const emotionsWeight = 0.2;
    
    const sentimentConfidence = sentiment.confidence;
    const topicsConfidence = topics.length > 0 ? topics.reduce((sum, t) => sum + t.relevance, 0) / topics.length : 0.5;
    const emotionsConfidence = emotions.length > 0 ? emotions.reduce((sum, e) => sum + e.score, 0) / emotions.length : 0.5;
    
    return sentimentConfidence * sentimentWeight + 
           topicsConfidence * topicsWeight + 
           emotionsConfidence * emotionsWeight;
  }

  private calculateMovingAverage(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateAverageSentiment(feedbackItems: EmployeeFeedbackAnalysis[]): number {
    if (feedbackItems.length === 0) {return 0;}
    return feedbackItems.reduce((sum, f) => sum + f.sentiment.overall.score, 0) / feedbackItems.length;
  }

  private calculateVariation(values: number[]): number {
    if (values.length < 2) {return 0;}
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Stub implementations for remaining methods
  private extractOverallSentiment(prediction: any): SentimentPolarity { 
    return { label: 'NEUTRAL', score: 0 }; 
  }
  
  private async extractAspectSentiments(content: string, prediction: any, language: string): Promise<AspectSentiment[]> { 
    return []; 
  }
  
  private calculateIntensity(score: number): number { 
    return Math.abs(score); 
  }
  
  private processTopicPrediction(prediction: any, content: string): ExtractedTopic[] { 
    return []; 
  }
  
  private countEmotionalKeywords(content: string): any { 
    return {}; 
  }
  
  private processEmotionPrediction(prediction: any): EmotionScore[] { 
    return []; 
  }
  
  private suggestSentimentImprovement(content: string, topics: ExtractedTopic[]): string { 
    return 'Review and address the concerns mentioned in the feedback'; 
  }
  
  private suggestTopicImprovement(topic: ExtractedTopic, content: string): string { 
    return `Improve ${topic.topic} based on feedback`; 
  }
  
  private createEmptyTrends(organizationId: string, period: DateRange): SentimentTrends {
    return {
      organizationId,
      period,
      overallTrend: 'STABLE',
      categoryTrends: [],
      insights: [],
      recommendations: []
    };
  }
  
  private async getFeedbackForPeriod(organizationId: string, period: DateRange): Promise<EmployeeFeedbackAnalysis[]> { 
    return []; 
  }
  
  private groupFeedbackBy(feedbackData: EmployeeFeedbackAnalysis[], groupBy: string): Record<string, EmployeeFeedbackAnalysis[]> { 
    return {}; 
  }
  
  private async generateBatchSummary(results: EmployeeFeedbackAnalysis[], processingTime: number): Promise<any> { 
    return {}; 
  }
  
  private calculateOverallMetrics(feedbackData: EmployeeFeedbackAnalysis[]): any { 
    return {}; 
  }
  
  private async getRealTimeMetrics(organizationId: string): Promise<any> { 
    return {}; 
  }
  
  private async calculateDashboardTrends(feedbackData: EmployeeFeedbackAnalysis[], timeRange: DateRange): Promise<any> { 
    return {}; 
  }
  
  private async generateSentimentBreakdowns(feedbackData: EmployeeFeedbackAnalysis[]): Promise<any> { 
    return {}; 
  }
  
  private async getSentimentAlerts(organizationId: string, feedbackData: EmployeeFeedbackAnalysis[]): Promise<any[]> { 
    return []; 
  }
  
  private getTopInsights(feedbackData: EmployeeFeedbackAnalysis[]): any[] { 
    return []; 
  }
  
  private async getPriorityActionItems(organizationId: string, feedbackData: EmployeeFeedbackAnalysis[]): Promise<ActionItem[]> { 
    return []; 
  }
  
  private async forecastSentimentTrends(feedbackData: EmployeeFeedbackAnalysis[], overallTrend: TrendDirection, days: number): Promise<any> { 
    return {}; 
  }
  
  private extractAreaFromDescription(description: string): string { 
    return 'General'; 
  }
  
  private generateRecommendationAction(insight: SentimentInsight): string { 
    return 'Investigate and address the identified issue'; 
  }
  
  private identifyRequiredResources(insight: SentimentInsight): string[] { 
    return ['HR team', 'Manager attention']; 
  }
  
  private generateCategoryRecommendation(category: string): string { 
    return `Improve processes and conditions related to ${category}`; 
  }
  
  private getCategoryResources(category: string): string[] { 
    return ['Department head', 'Process improvement team']; 
  }
}

// Export singleton instance
export const sentimentAnalysisService = new SentimentAnalysisService();