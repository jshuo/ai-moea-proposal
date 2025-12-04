import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const context = await request.json();
    
    const { language, metrics, batteries, envAlerts, routeEvents, date, reportId } = context;
    
    // Construct prompt for LLM
    const systemPrompt = language === 'zh'
      ? `你是一位專業的供應鏈風險分析師。根據提供的數據，生成一份詳細的中文 AI 供應鏈風險日報。報告應包含執行摘要、關鍵指標、電池健康分析、環境監控、路線安全和建議行動。使用 Markdown 格式，語氣專業且具有洞察力。`
      : `You are a professional supply chain risk analyst. Generate a detailed AI Supply Chain Risk Daily Report in English based on the provided data. The report should include an executive summary, key indicators, battery health analysis, environmental monitoring, route security, and recommended actions. Use Markdown format with a professional and insightful tone.`;

    const userPrompt = `
Generate a comprehensive supply chain risk report with the following data:

**Report Metadata:**
- Date: ${date}
- Report ID: ${reportId}
- Language: ${language}

**Key Metrics:**
- Total Critical Issues: ${metrics.totalCritical}
- Critical Battery Issues: ${metrics.criticalBat}
- Critical Environmental Alerts: ${metrics.criticalEnv}
- Critical Route Events: ${metrics.criticalRoute}
- Average Battery Health Index: ${metrics.avgBHI}%
- Total Batteries Monitored: ${metrics.totalBatteries}
- Total Environmental Alerts: ${metrics.totalEnvAlerts}
- Total Route Events: ${metrics.totalRouteEvents}
- Tamper Alerts: ${metrics.tamperAlerts}

**Battery Details (Critical/Warning):**
${JSON.stringify(batteries, null, 2)}

**Environmental Alerts:**
${JSON.stringify(envAlerts, null, 2)}

**Route Security Events:**
${JSON.stringify(routeEvents, null, 2)}

${language === 'zh' 
  ? `請生成一份專業的中文報告，包含：
1. 標題和報告元數據
2. 執行摘要（使用表情符號和粗體突出關鍵問題）
3. 關鍵指標表格
4. 電池健康分析（列出需要更換的設備）
5. 環境監控分析
6. 路線安全分析
7. 建議行動清單（至少3項）
8. 報告生成時間戳記

使用專業術語，提供可操作的見解。` 
  : `Generate a professional English report including:
1. Title and report metadata
2. Executive summary (use emojis and bold for critical issues)
3. Key indicators table
4. Battery health analysis (list devices needing replacement)
5. Environmental monitoring analysis
6. Route security analysis
7. Recommended actions list (at least 3 items)
8. Report generation timestamp

Use professional terminology and provide actionable insights.`}
`;

    // Call OpenAI API (or other LLM)
    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!llmResponse.ok) {
      const error = await llmResponse.json();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate report from LLM');
    }

    const llmData = await llmResponse.json();
    const report = llmData.choices[0].message.content;

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error in generate-report API:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
