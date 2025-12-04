import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

export async function POST(request: NextRequest) {
  try {
    const context = await request.json();
    
    const { language, metrics, batteries, envAlerts, routeEvents, date, reportId } = context;
    
    // Initialize LangChain components
    const model = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2000,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Create prompt template for the report
    const reportInstructions = language === 'zh' 
      ? `請生成一份專業的中文 AI 供應鏈風險日報，包含：
1. 標題 (# AI 供應鏈風險日報) 和報告元數據
2. 執行摘要（使用表情符號和粗體突出關鍵問題）
3. 關鍵指標表格 (使用 Markdown 表格格式)
4. 電池健康分析（分析趨勢並列出需要更換的設備）
5. 環境監控分析（分析異常模式和風險等級）
6. 路線安全分析（評估篡改和偏離風險）
7. 建議行動清單（至少3項具體可執行的建議）
8. 報告生成時間戳記

使用專業術語，提供深入的可操作見解，並基於數據趨勢提出預測性建議。`
      : `Generate a professional AI Supply Chain Risk Daily Report in English including:
1. Title (# AI Supply Chain Risk Daily Report) and report metadata
2. Executive summary (use emojis and bold for critical issues)
3. Key indicators table (use Markdown table format)
4. Battery health analysis (analyze trends and list devices needing replacement)
5. Environmental monitoring analysis (analyze anomaly patterns and risk levels)
6. Route security analysis (assess tampering and deviation risks)
7. Recommended actions list (at least 3 specific actionable recommendations)
8. Report generation timestamp

Use professional terminology, provide in-depth actionable insights, and offer predictive recommendations based on data trends.`;

    const promptTemplate = PromptTemplate.fromTemplate(`
You are a professional supply chain risk analyst with expertise in IoT-enabled logistics, battery health management, cold chain monitoring, and predictive maintenance.

**Report Metadata:**
- Date: {date}
- Report ID: {reportId}
- Language: {language}

**Key Metrics:**
- Total Critical Issues: {totalCritical}
- Critical Battery Issues: {criticalBat}
- Critical Environmental Alerts: {criticalEnv}
- Critical Route Events: {criticalRoute}
- Average Battery Health Index: {avgBHI}%
- Total Batteries Monitored: {totalBatteries}
- Total Environmental Alerts: {totalEnvAlerts}
- Total Route Events: {totalRouteEvents}
- Tamper Alerts: {tamperAlerts}

**Battery Details (Critical/Warning):**
{batteriesJson}

**Environmental Alerts:**
{envAlertsJson}

**Route Security Events:**
{routeEventsJson}

**Instructions:**
{instructions}

Generate the report in Markdown format. Be thorough and professional.
`);

    // Create the chain
    const chain = promptTemplate.pipe(model).pipe(new StringOutputParser());

    // Invoke the chain
    const report = await chain.invoke({
      date,
      reportId,
      language: language === 'zh' ? 'Chinese (Traditional)' : 'English',
      totalCritical: metrics.totalCritical,
      criticalBat: metrics.criticalBat,
      criticalEnv: metrics.criticalEnv,
      criticalRoute: metrics.criticalRoute,
      avgBHI: metrics.avgBHI,
      totalBatteries: metrics.totalBatteries,
      totalEnvAlerts: metrics.totalEnvAlerts,
      totalRouteEvents: metrics.totalRouteEvents,
      tamperAlerts: metrics.tamperAlerts,
      batteriesJson: JSON.stringify(batteries, null, 2),
      envAlertsJson: JSON.stringify(envAlerts, null, 2),
      routeEventsJson: JSON.stringify(routeEvents, null, 2),
      instructions: reportInstructions,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error in generate-report API:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
