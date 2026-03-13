export type StudyLanguage = "RO" | "EN" | "HU" | "DE" | "FR";

export interface Specialization {
  name: string;
  duration_years: number;
}

export interface Faculty {
  name: string;
  specializations_by_language: Partial<Record<StudyLanguage, Specialization[]>>;
}

export interface University {
  university: string;
  slug: string;
  location: string;
  faculties: Faculty[];
}

export const LANGUAGE_LABELS: Record<StudyLanguage, string> = {
  RO: "Română",
  EN: "Engleză",
  HU: "Maghiară",
  DE: "Germană",
  FR: "Franceză",
};

export const UNIVERSITIES_DATA: University[] = [
  {
    university: "Universitatea Babeș-Bolyai",
    slug: "ubb-cluj",
    location: "Cluj-Napoca",
    faculties: [
      {
        name: "Facultatea de Matematică și Informatică",
        specializations_by_language: {
          RO: [
            { name: "Informatică", duration_years: 3 },
            { name: "Matematică", duration_years: 3 },
            { name: "Matematică-Informatică", duration_years: 3 },
          ],
          EN: [
            { name: "Computer Science", duration_years: 3 },
            { name: "Mathematics", duration_years: 3 },
            { name: "Information Engineering", duration_years: 4 },
          ],
          HU: [
            { name: "Informatika", duration_years: 3 },
            { name: "Matematika", duration_years: 3 },
            { name: "Matematika-Informatika", duration_years: 3 },
          ],
          DE: [{ name: "Informatik", duration_years: 3 }],
        },
      },
      {
        name: "Facultatea de Științe Economice și Gestiunea Afacerilor (FSEGA)",
        specializations_by_language: {
          RO: [
            { name: "Informatică Economică", duration_years: 3 },
            {
              name: "Contabilitate și Informatică de Gestiune",
              duration_years: 3,
            },
            { name: "Finanțe și Bănci", duration_years: 3 },
            { name: "Management", duration_years: 3 },
            { name: "Marketing", duration_years: 3 },
            {
              name: "Economia Comerțului, Turismului și Serviciilor",
              duration_years: 3,
            },
          ],
          EN: [
            {
              name: "Accounting and Management Information Systems",
              duration_years: 3,
            },
            { name: "Finance and Banking", duration_years: 3 },
            { name: "Management", duration_years: 3 },
            { name: "Marketing", duration_years: 3 },
          ],
          HU: [
            { name: "Gazdasági informatika", duration_years: 3 },
            { name: "Pénzügy és bank", duration_years: 3 },
            { name: "Menedzsment", duration_years: 3 },
            { name: "Marketing", duration_years: 3 },
          ],
          FR: [
            {
              name: "Comptabilité et informatique de gestion",
              duration_years: 3,
            },
          ],
        },
      },
      {
        name: "Facultatea de Științe Politice, Administrative și ale Comunicării (FSPAC)",
        specializations_by_language: {
          RO: [
            { name: "Comunicare și Relații Publice", duration_years: 3 },
            { name: "Jurnalism", duration_years: 3 },
            { name: "Media Digitală", duration_years: 3 },
            { name: "Publicitate", duration_years: 3 },
            { name: "Administrație Publică", duration_years: 3 },
          ],
          EN: [
            {
              name: "Communication and Public Relations",
              duration_years: 3,
            },
            { name: "Journalism", duration_years: 3 },
            { name: "Digital Media", duration_years: 3 },
            { name: "Leadership in the Public Sector", duration_years: 3 },
          ],
          HU: [
            {
              name: "Kommunikáció és közkapcsolatok",
              duration_years: 3,
            },
            { name: "Újságírás", duration_years: 3 },
            { name: "Digitális média", duration_years: 3 },
          ],
          DE: [
            {
              name: "Kommunikation und Public Relations",
              duration_years: 3,
            },
          ],
        },
      },
      {
        name: "Facultatea de Drept",
        specializations_by_language: {
          RO: [{ name: "Drept", duration_years: 4 }],
          HU: [{ name: "Jog", duration_years: 4 }],
        },
      },
      {
        name: "Facultatea de Psihologie și Științe ale Educației",
        specializations_by_language: {
          RO: [
            { name: "Psihologie", duration_years: 3 },
            { name: "Psihopedagogie Specială", duration_years: 3 },
            {
              name: "Pedagogia Învățământului Primar și Preșcolar",
              duration_years: 3,
            },
          ],
          EN: [{ name: "Psychology", duration_years: 3 }],
          HU: [
            { name: "Pszichológia", duration_years: 3 },
            { name: "Gyógypedagógia", duration_years: 3 },
          ],
        },
      },
      {
        name: "Facultatea de Inginerie (Extensia Reșița)",
        specializations_by_language: {
          RO: [
            { name: "Inginerie Mecanică", duration_years: 4 },
            { name: "Electromecanică", duration_years: 4 },
            { name: "Informatică Aplicată", duration_years: 3 },
          ],
        },
      },
      {
        name: "Facultatea de Litere",
        specializations_by_language: {
          RO: [
            { name: "Limba și Literatura Română", duration_years: 3 },
            { name: "Limbi Moderne Aplicate", duration_years: 3 },
          ],
          EN: [
            { name: "English Language and Literature", duration_years: 3 },
            { name: "Applied Modern Languages", duration_years: 3 },
          ],
          HU: [
            { name: "Magyar nyelv és irodalom", duration_years: 3 },
          ],
        },
      },
    ],
  },
];
