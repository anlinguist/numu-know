'use client';

import React, { useState } from 'react';
import type { Word, NewAttribute } from '@/types/story';

interface NewAttProps {
    editingCurrentWordObj: Word | null;
    setEditingCurrentWordObj: (obj: Word | null) => void;
    deleteAtt: (att: string) => void;
    currentIndex: number;
    newAtt: NewAttribute;
    newAttributes: NewAttribute[];
    setNewAttributes: (attrs: NewAttribute[]) => void;
}

function NewAtt({ editingCurrentWordObj, setEditingCurrentWordObj, deleteAtt, currentIndex, newAtt, newAttributes, setNewAttributes }: NewAttProps) {
    const [confirmedAttName, setConfirmedAttName] = useState(false);
    const capitalize = (s: string) => {
        if (typeof s !== 'string') return ''
        return s.charAt(0).toUpperCase() + s.slice(1)
    }

    const updateAttName = (e: React.ChangeEvent<HTMLInputElement>) => {
        let updated = [...newAttributes];
        updated[currentIndex]['attributeName'] = e.target.value;
        setNewAttributes(updated)
    }

    return (<label>
        <div className='editAttLabelContainer'>
            {
                !confirmedAttName &&
                <div>
                    <input defaultValue={newAtt['attributeName']} className='editNewAttName' onChange={((e) => setTimeout(() => updateAttName(e), 5))} />
                    <span onClick={((e) => {
                        if (newAtt['attributeName'].trim().length === 0) {
                            return
                        }
                        setConfirmedAttName(true);
                        // add attName: '' to editingCurrentWordObj
                        setEditingCurrentWordObj({
                            ...editingCurrentWordObj,
                            [newAtt['attributeName']]: ''
                        })

                        let updated = [...newAttributes];
                        let updatedAtt = { attributeName: newAtt['attributeName'], attributeValue: '' }
                        updated[currentIndex] = updatedAtt
                        setNewAttributes(updated)
                    })}>&#x2713;</span></div>
            }
            {
                confirmedAttName &&
                <div className='editAttLabel'>{capitalize(newAtt['attributeName'])}</div>
            }
            <div className='editAttDelete' onClick={
                ((e) => setTimeout(() => {
                    // remove att element
                    // setNewAttributes
                    let updated = [...newAttributes];
                    updated.splice(currentIndex, 1);
                    setNewAttributes(updated);

                    // e.target.parentNode.parentNode.parentNode.removeChild(e.target.parentNode.parentNode)
                    deleteAtt(newAtt['attributeName'])
                }, 5))
            }>Delete</div>
        </div>
        <textarea value={newAtt['attributeValue']} disabled={confirmedAttName ? false : true} onChange={
            ((e) => {
                let updated = [...newAttributes];
                updated[currentIndex]['attributeValue'] = e.target.value;
                setNewAttributes(updated)

                setTimeout(
                    () => setEditingCurrentWordObj({
                        ...editingCurrentWordObj,
                        [newAtt['attributeName']]: e.target.value
                    }), 5)
            }
            )
        }></textarea>
    </label>
    )
}

export default NewAtt;
