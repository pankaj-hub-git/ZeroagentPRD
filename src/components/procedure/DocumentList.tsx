import { FileText, MapPin, Clock } from 'lucide-react';
import type { GuideDocument } from '@/types/procedure';

interface Props {
  documents: GuideDocument[];
}

export function DocumentList({ documents }: Props) {
  // Group by required_from
  const groups = documents.reduce<Record<string, GuideDocument[]>>((acc, doc) => {
    const key = doc.required_from || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([party, docs]) => (
        <div key={party}>
          <h3 className="text-text-dim text-label tracking-[2px] uppercase font-semibold mb-3">
            DOCUMENTS FROM {party.toUpperCase()}
          </h3>
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-surface border border-border rounded-lg p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gold shrink-0" />
                    <span className="text-text-primary text-subheading font-semibold">
                      {doc.document_name}
                    </span>
                  </div>
                  {doc.is_mandatory ? (
                    <span className="text-label font-semibold text-danger bg-danger/15 px-2 py-0.5 rounded shrink-0">
                      MANDATORY
                    </span>
                  ) : (
                    <span className="text-label font-semibold text-text-dim bg-text-dim/15 px-2 py-0.5 rounded shrink-0">
                      OPTIONAL
                    </span>
                  )}
                </div>

                <p className="text-text-secondary text-body mb-3">
                  {doc.document_description}
                </p>

                <div className="flex flex-wrap gap-4 text-label text-text-dim">
                  {doc.where_to_get && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      Get from: {doc.where_to_get}
                    </span>
                  )}
                  {doc.validity_period && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Validity: {doc.validity_period}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
