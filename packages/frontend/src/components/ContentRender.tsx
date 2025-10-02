const ContentRender = ({ content }) => {
    console.log(content)
    const line = content
    return <div>
        <div className="flex flex-row gap-2">
            {line.translateList.map(({ fiftytones, ja, romaji }, i2) => {
                return (
                    <div key={i2}>
                        <div className={'flex flex-col'}>
                            <ruby>
                                {ja}
                                <rt>{fiftytones}</rt>

                                <rt style={{
                                    visibility: 'hidden'
                                }}>あ</rt>

                            </ruby>
                            <span>{romaji}</span>
                        </div>
                    </div>
                );
            })}
        </div>
        <div className={'text-blue-400'}>{line.chinese}</div>
    </div>
}

export default ContentRender;