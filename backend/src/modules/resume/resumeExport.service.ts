import PDFDocument from 'pdfkit';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { BadRequestError } from '../../utils/errors';

export interface ResumeTemplateDefinition {
  id: string;
  name: string;
  focus: string;
  recommendedSections: string[];
  sectionOrder: Array<'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications'>;
  atsGuidance: string;
}

export const RESUME_TEMPLATES: ResumeTemplateDefinition[] = [
  {
    id: 'software-engineer',
    name: 'Software Engineer Resume',
    focus: 'Balanced engineering experience, system design, core languages & delivery impact',
    recommendedSections: ['Summary', 'Technical Skills', 'Experience', 'Projects', 'Education', 'Certifications'],
    sectionOrder: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications'],
    atsGuidance: 'Clean single-column chronological hierarchy compatible with all major ATS parsers.',
  },
  {
    id: 'fullstack-developer',
    name: 'Full-Stack Developer Resume',
    focus: 'End-to-end product engineering across frontend UI, backend APIs, and SQL databases',
    recommendedSections: ['Summary', 'Core Stack', 'Experience', 'Selected Projects', 'Education'],
    sectionOrder: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications'],
    atsGuidance: 'Highlights full-lifecycle delivery and stack breadth upfront.',
  },
  {
    id: 'frontend-developer',
    name: 'Frontend Developer Resume',
    focus: 'Design systems, React/TypeScript UI engineering, accessibility & client performance',
    recommendedSections: ['Summary', 'Frontend & UI Stack', 'Shipped Applications', 'Experience', 'Education'],
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications'],
    atsGuidance: 'Emphasizes shipped interfaces and component architecture clarity.',
  },
  {
    id: 'backend-developer',
    name: 'Backend Developer Resume',
    focus: 'APIs, distributed services, database modeling, webhooks, and security reliability',
    recommendedSections: ['Summary', 'Backend & Data Stack', 'Experience', 'Architecture Projects', 'Education'],
    sectionOrder: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications'],
    atsGuidance: 'Prioritizes API scalability, data integrity, and operational reliability.',
  },
  {
    id: 'ai-ml-engineer',
    name: 'AI/ML Engineer Resume',
    focus: 'LLM orchestration, structured extraction, evaluation pipelines & Python/TypeScript tooling',
    recommendedSections: ['Summary', 'AI / ML & Engineering Stack', 'Applied AI Projects', 'Experience', 'Education', 'Certifications'],
    sectionOrder: ['summary', 'skills', 'projects', 'experience', 'education', 'certifications'],
    atsGuidance: 'Surfaces model integration, evaluation rigor, and production tooling clearly.',
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer Resume',
    focus: 'CI/CD automation, Docker containers, cloud infrastructure, observability & security',
    recommendedSections: ['Summary', 'Infrastructure & Tooling', 'Experience', 'Platform Projects', 'Certifications', 'Education'],
    sectionOrder: ['summary', 'skills', 'experience', 'projects', 'certifications', 'education'],
    atsGuidance: 'Leads with cloud tooling, containerization, and certification credentials.',
  },
  {
    id: 'entry-level-developer',
    name: 'Entry-Level Developer Resume',
    focus: 'Projects-first format emphasizing education, technical foundation & GitHub builds',
    recommendedSections: ['Summary', 'Technical Skills', 'Key Projects', 'Education', 'Experience', 'Certifications'],
    sectionOrder: ['summary', 'skills', 'projects', 'education', 'experience', 'certifications'],
    atsGuidance: 'Places technical skills, projects, and education ahead of limited formal roles.',
  },
  {
    id: 'experienced-developer',
    name: 'Experienced Developer Resume',
    focus: 'Senior architectural leadership, domain depth, delivery scale & executive summary',
    recommendedSections: ['Executive Summary', 'Career Experience', 'Core Architecture Stack', 'Key Systems', 'Education', 'Certifications'],
    sectionOrder: ['summary', 'experience', 'skills', 'projects', 'education', 'certifications'],
    atsGuidance: 'Leads with senior delivery history and architectural impact.',
  },
];

export interface StructuredResumeDocument {
  template: ResumeTemplateDefinition;
  fullName: string;
  headline: string;
  summary: string;
  location: string | null;
  links: string[];
  skills: string[];
  experience: Array<{ title: string; company?: string; period?: string; summary?: string }>;
  projects: Array<{ title: string; technologies?: string[]; summary: string; url?: string }>;
  education: Array<{ degree: string; institution: string; year?: string }>;
  certifications: Array<{ name: string; issuer?: string; year?: string }>;
}

export function getResumeTemplateOrThrow(templateId: string): ResumeTemplateDefinition {
  const found = RESUME_TEMPLATES.find((t) => t.id === templateId);
  if (!found) {
    throw new BadRequestError(`Unknown resume template "${templateId}".`);
  }
  return found;
}

export async function buildResumePdfBuffer(docData: StructuredResumeDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'LETTER', compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const drawHeading = (label: string) => {
      doc.moveDown(0.7);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(label.toUpperCase());
      const y = doc.y + 2;
      doc.moveTo(48, y).lineTo(564, y).lineWidth(0.75).strokeColor('#CBD5E1').stroke();
      doc.moveDown(0.4);
    };

    // Header
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#0F172A').text(docData.fullName);
    if (docData.headline) {
      doc.font('Helvetica').fontSize(11.5).fillColor('#1D4ED8').text(docData.headline);
    }
    const metaLine = [docData.location, ...docData.links].filter(Boolean).join('  |  ');
    if (metaLine) {
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(9.5).fillColor('#475569').text(metaLine);
    }

    for (const section of docData.template.sectionOrder) {
      if (section === 'summary' && docData.summary) {
        drawHeading('Professional Summary');
        doc.font('Helvetica').fontSize(10).fillColor('#1E293B').text(docData.summary, { lineGap: 2 });
      } else if (section === 'skills' && docData.skills.length > 0) {
        drawHeading('Technical Skills');
        doc.font('Helvetica').fontSize(10).fillColor('#1E293B').text(docData.skills.join('  |  '), {
          lineGap: 2,
        });
      } else if (section === 'experience' && docData.experience.length > 0) {
        drawHeading('Experience');
        for (const role of docData.experience) {
          const titleLine = [role.title, role.company].filter(Boolean).join(' - ');
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0F172A').text(titleLine);
          if (role.period) {
            doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(role.period);
          }
          if (role.summary) {
            doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B').text(role.summary, { lineGap: 1.5 });
          }
          doc.moveDown(0.35);
        }
      } else if (section === 'projects' && docData.projects.length > 0) {
        drawHeading('Selected Projects');
        for (const proj of docData.projects) {
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#0F172A').text(proj.title);
          if (proj.technologies && proj.technologies.length > 0) {
            doc.font('Helvetica').fontSize(9).fillColor('#1D4ED8').text(proj.technologies.join(', '));
          }
          if (proj.summary) {
            doc.font('Helvetica').fontSize(9.5).fillColor('#1E293B').text(proj.summary, { lineGap: 1.5 });
          }
          if (proj.url) {
            doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(proj.url);
          }
          doc.moveDown(0.35);
        }
      } else if (section === 'education' && docData.education.length > 0) {
        drawHeading('Education');
        for (const edu of docData.education) {
          const line = [edu.degree, edu.institution, edu.year].filter(Boolean).join(' - ');
          doc.font('Helvetica').fontSize(10).fillColor('#1E293B').text(line);
        }
      } else if (section === 'certifications' && docData.certifications.length > 0) {
        drawHeading('Certifications');
        for (const cert of docData.certifications) {
          const line = [cert.name, cert.issuer, cert.year].filter(Boolean).join(' - ');
          doc.font('Helvetica').fontSize(10).fillColor('#1E293B').text(line);
        }
      }
    }

    doc.end();
  });
}

export async function buildResumeDocxBuffer(docData: StructuredResumeDocument): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: docData.fullName, bold: true, size: 36 })],
    }),
  ];

  if (docData.headline) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: docData.headline, size: 22, color: '1D4ED8' })],
      })
    );
  }

  const metaLine = [docData.location, ...docData.links].filter(Boolean).join(' | ');
  if (metaLine) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: metaLine, size: 19, color: '475569' })],
      })
    );
  }

  const addSectionHeader = (label: string) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 22 })],
      })
    );
  };

  for (const section of docData.template.sectionOrder) {
    if (section === 'summary' && docData.summary) {
      addSectionHeader('Professional Summary');
      children.push(new Paragraph({ children: [new TextRun({ text: docData.summary, size: 20 })] }));
    } else if (section === 'skills' && docData.skills.length > 0) {
      addSectionHeader('Technical Skills');
      children.push(new Paragraph({ children: [new TextRun({ text: docData.skills.join(', '), size: 20 })] }));
    } else if (section === 'experience' && docData.experience.length > 0) {
      addSectionHeader('Experience');
      for (const role of docData.experience) {
        const titleLine = [role.title, role.company, role.period].filter(Boolean).join(' — ');
        children.push(
          new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ text: titleLine, bold: true, size: 21 })],
          })
        );
        if (role.summary) {
          children.push(new Paragraph({ children: [new TextRun({ text: role.summary, size: 20 })] }));
        }
      }
    } else if (section === 'projects' && docData.projects.length > 0) {
      addSectionHeader('Selected Projects');
      for (const proj of docData.projects) {
        children.push(
          new Paragraph({
            spacing: { before: 100 },
            children: [
              new TextRun({
                text: `${proj.title}${
                  proj.technologies && proj.technologies.length > 0
                    ? ` (${proj.technologies.join(', ')})`
                    : ''
                }`,
                bold: true,
                size: 21,
              }),
            ],
          })
        );
        if (proj.summary) {
          children.push(new Paragraph({ children: [new TextRun({ text: proj.summary, size: 20 })] }));
        }
        if (proj.url) {
          children.push(new Paragraph({ children: [new TextRun({ text: proj.url, size: 18, color: '475569' })] }));
        }
      }
    } else if (section === 'education' && docData.education.length > 0) {
      addSectionHeader('Education');
      for (const edu of docData.education) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: [edu.degree, edu.institution, edu.year].filter(Boolean).join(' — '),
                size: 20,
              }),
            ],
          })
        );
      }
    } else if (section === 'certifications' && docData.certifications.length > 0) {
      addSectionHeader('Certifications');
      for (const cert of docData.certifications) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: [cert.name, cert.issuer, cert.year].filter(Boolean).join(' — '),
                size: 20,
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBuffer(doc);
}
